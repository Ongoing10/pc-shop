package com.pcshop.inventory;

import com.pcshop.common.quarkus.CurrentUser;
import com.pcshop.contracts.AuthUser;
import com.pcshop.contracts.BusinessException;
import com.pcshop.contracts.ErrorCode;
import com.pcshop.contracts.ResponseData;
import com.pcshop.excel.ExcelMessages;
import com.pcshop.excel.dto.ImportResults;
import com.pcshop.excel.dto.ImportResults.ImportResult;
import com.pcshop.excel.dto.ImportResults.ValidateResult;
import com.pcshop.excel.engine.ColumnDef;
import com.pcshop.excel.engine.ExcelFileException;
import com.pcshop.excel.engine.ExcelGuide;
import com.pcshop.excel.engine.ExcelReader;
import com.pcshop.excel.engine.ExcelResultWriter;
import com.pcshop.excel.engine.ExcelSheetSpec;
import com.pcshop.excel.engine.ExcelWriter;
import com.pcshop.excel.reference.ReferenceItem;
import com.pcshop.excel.store.ImportStore;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.persistence.OptimisticLockException;
import org.eclipse.microprofile.config.inject.ConfigProperty;
import org.eclipse.microprofile.rest.client.inject.RestClient;
import org.hibernate.StaleStateException;
import org.jboss.logging.Logger;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

/**
 * Phiếu nhập kho bằng Excel (IMP-2, quyền inventory:write) và export tồn kho (EXP-3).
 * Import "tất cả hoặc không": có dòng lỗi thì không ghi gì; ghi dùng lại {@link InventoryService#importStockLines}.
 */
@ApplicationScoped
public class StockExcelService {

    private static final Logger log = Logger.getLogger(StockExcelService.class);

    static final String KIND = "inventory.stock-import";
    private static final String META_REFERENCE = "referenceCode";
    private static final int REFERENCE_MAX = 50;
    private static final int NOTE_MAX = 255;

    public record ExcelFile(String filename, byte[] content) {
    }

    @Inject
    WarehouseRepository warehouses;

    @Inject
    InventoryRepository inventories;

    @Inject
    InventoryService inventoryService;

    @Inject
    CurrentUser currentUser;

    @Inject
    ImportStore importStore;

    @Inject
    @RestClient
    CatalogClient catalog;

    @ConfigProperty(name = "pcshop.import.max-rows", defaultValue = "1000")
    int maxRows;

    @ConfigProperty(name = "pcshop.excel.max-export-rows", defaultValue = "10000")
    int maxExportRows;

    // ------------------------------------------------------------------ import

    public ExcelFile template() {
        currentUser.requirePermission("inventory:write");
        ExcelGuide guide = new ExcelGuide("Mẫu phiếu nhập kho",
                List.of("Số phiếu nhập (referenceCode) nhập ở form upload, không nằm trong file.",
                        "Mã kho chọn trong danh sách thả xuống (chỉ kho đang hoạt động).",
                        "SKU phải là sản phẩm đã công bố trên catalog (không nhận sản phẩm Nháp).",
                        "Một cặp (Mã kho, SKU) chỉ xuất hiện một lần trong file.",
                        "Có bất kỳ dòng lỗi nào thì cả phiếu không được ghi."),
                Map.of("warehouse", exampleWarehouse(), "sku", "CPU-I5-14600K", "quantity", 10,
                        "note", "Lô hàng tháng 10"));
        try {
            byte[] content = ExcelWriter.writeTemplate(importSpec(), references(), ExcelMessages.VI, guide);
            return new ExcelFile("Mẫu phiếu nhập kho.xlsx", content);
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
    }

    public ValidateResult validate(byte[] content, String referenceCode) {
        AuthUser user = currentUser.requirePermission("inventory:write");
        String reference = checkReference(referenceCode);
        List<StockImportRow> rows = read(content);
        List<InventoryService.StockLine> lines = check(rows);

        UUID importId = importStore.save(content, Map.of(ImportStore.META_USER_ID, user.id().toString(),
                ImportStore.META_KIND, KIND, META_REFERENCE, reference));
        List<Map<String, Object>> preview = new ArrayList<>();
        for (StockImportRow row : rows) {
            if (preview.size() >= ImportResults.PREVIEW_ROWS) {
                break;
            }
            if (row.getIsValid()) {
                Map<String, Object> item = new LinkedHashMap<>();
                item.put("row", row.getRow() + 1);
                item.put("warehouse", ReferenceItem.extractCode(row.getWarehouse()));
                item.put("sku", row.getSku());
                item.put("quantity", row.getQuantity());
                item.put("note", row.getNote());
                preview.add(item);
            }
        }
        int invalid = (int) ImportResults.invalidCount(rows);
        log.debugf("Kiểm tra phiếu nhập %s: %d dòng, %d dòng ghi được", reference, rows.size(), lines.size());
        return new ValidateResult(importId, "IMPORT", rows.size(), rows.size() - invalid, invalid,
                ImportResults.errors(rows), preview);
    }

    public ExcelFile resultFile(UUID importId) {
        AuthUser user = currentUser.requirePermission("inventory:write");
        ownMeta(importId, user);
        byte[] content = load(importId);
        List<StockImportRow> rows = read(content);
        check(rows);
        return new ExcelFile("Kết quả kiểm tra phiếu nhập kho.xlsx",
                ExcelResultWriter.withErrors(content, ImportResults.errorsByRow(rows)));
    }

    /** Kiểm tra lại từ đầu; có dòng lỗi thì không ghi gì (giữ file để tải file kết quả), sạch thì ghi một transaction. */
    public ImportResult importFile(UUID importId) {
        AuthUser user = currentUser.requirePermission("inventory:write");
        Map<String, String> meta = ownMeta(importId, user);
        byte[] content = load(importId);
        List<StockImportRow> rows = read(content);
        List<InventoryService.StockLine> lines = check(rows);
        if (lines.size() != rows.size()) {
            return new ImportResult(rows.size(), 0, 0, rows.size(), ImportResults.errors(rows));
        }
        InventoryService.StockImportResult saved;
        try {
            saved = inventoryService.importStockLines(meta.get(META_REFERENCE), lines);
        } catch (RuntimeException e) {
            if (isOptimisticLock(e)) {
                throw new BusinessException(ErrorCode.CONFLICT, "Tồn kho vừa được người khác thay đổi, hãy import lại");
            }
            throw e;
        }
        importStore.delete(importId);
        return new ImportResult(rows.size(), saved.createdRows(), rows.size() - saved.createdRows(), 0, List.of());
    }

    private ExcelSheetSpec importSpec() {
        return ExcelSheetSpec.of(StockImportRow.class, ExcelMessages.VI).withSheetName("Nhập kho").withMaxRows(maxRows);
    }

    private Map<String, List<ReferenceItem>> references() {
        return Map.of(StockImportRow.WAREHOUSE_REF, warehouses.listActive().stream()
                .map(w -> new ReferenceItem(w.id, w.code, w.name)).toList());
    }

    private String exampleWarehouse() {
        return warehouses.listActive().stream().findFirst().map(w -> w.code + "|" + w.name).orElse("KHO-HN|Kho Hà Nội");
    }

    private List<StockImportRow> read(byte[] content) {
        List<StockImportRow> rows;
        try {
            rows = ExcelReader.read(content, StockImportRow.class, 1, ExcelMessages.VI);
        } catch (ExcelFileException e) {
            throw new BusinessException(ErrorCode.BAD_REQUEST, e.getMessage());
        }
        if (rows.size() > maxRows) {
            throw new BusinessException(ErrorCode.BAD_REQUEST, "File có quá " + maxRows + " dòng, hãy chia nhỏ phiếu");
        }
        return rows;
    }

    /** Kiểm tra nghiệp vụ từng dòng (kho, SKU trên catalog, số lượng, trùng kho+SKU); trả các dòng hợp lệ. */
    private List<InventoryService.StockLine> check(List<StockImportRow> rows) {
        Map<String, Warehouse> active = new HashMap<>();
        warehouses.listActive().forEach(w -> active.put(w.code.toUpperCase(Locale.ROOT), w));

        Set<String> skus = new LinkedHashSet<>();
        rows.forEach(r -> {
            if (r.getSku() != null) {
                skus.add(r.getSku().trim());
            }
        });
        Map<String, CatalogClient.ProductSummary> products = findProducts(skus);

        Map<String, Integer> firstRow = new HashMap<>();
        List<InventoryService.StockLine> lines = new ArrayList<>();
        for (StockImportRow row : rows) {
            String code = ReferenceItem.extractCode(row.getWarehouse());
            Warehouse warehouse = code == null ? null : active.get(code.toUpperCase(Locale.ROOT));
            if (code != null && warehouse == null) {
                row.addError("Mã kho: " + code + " không tồn tại hoặc đã ngừng hoạt động");
            }
            String sku = row.getSku() == null ? null : row.getSku().trim();
            CatalogClient.ProductSummary product = sku == null ? null : products.get(sku);
            if (sku != null && product == null) {
                row.addError("SKU: " + sku + " không có trên catalog hoặc chưa công bố");
            }
            if (row.getQuantity() != null && row.getQuantity() <= 0) {
                row.addError("Số lượng nhập: phải lớn hơn 0");
            }
            if (row.getNote() != null && row.getNote().length() > NOTE_MAX) {
                row.addError("Ghi chú: tối đa " + NOTE_MAX + " ký tự");
            }
            if (warehouse != null && sku != null) {
                Integer previous = firstRow.putIfAbsent(warehouse.id + "|" + sku, row.getRow() + 1);
                if (previous != null) {
                    row.addError("SKU: trùng kho " + warehouse.code + " + SKU " + sku + " với dòng " + previous);
                }
            }
            if (row.getIsValid()) {
                lines.add(new InventoryService.StockLine(warehouse.id, sku, product.productId(), row.getQuantity(),
                        row.getNote()));
            }
        }
        return lines;
    }

    /** Gọi POST /products/batch của catalog theo lô 100 SKU (một lần cho cả file, không gọi từng dòng). */
    private Map<String, CatalogClient.ProductSummary> findProducts(Set<String> skus) {
        Map<String, CatalogClient.ProductSummary> result = new HashMap<>();
        List<String> all = new ArrayList<>(skus);
        for (int from = 0; from < all.size(); from += CatalogClient.BATCH_SIZE) {
            List<String> chunk = all.subList(from, Math.min(from + CatalogClient.BATCH_SIZE, all.size()));
            ResponseData<List<CatalogClient.ProductSummary>> response;
            try {
                response = catalog.batch(new CatalogClient.BatchRequest(List.copyOf(chunk)));
            } catch (RuntimeException e) {
                log.errorf(e, "Gọi catalog-service /products/batch lỗi");
                throw new BusinessException(ErrorCode.EXTERNAL_SERVICE_ERROR,
                        "Không kiểm tra được SKU với catalog-service, hãy thử lại sau");
            }
            if (response != null && response.data() != null) {
                response.data().forEach(p -> result.put(p.sku(), p));
            }
        }
        return result;
    }

    private static boolean isOptimisticLock(Throwable e) {
        for (Throwable t = e; t != null; t = t.getCause()) {
            if (t instanceof OptimisticLockException || t instanceof StaleStateException) {
                return true;
            }
        }
        return false;
    }

    private static String checkReference(String referenceCode) {
        if (referenceCode == null || referenceCode.isBlank()) {
            throw new BusinessException(ErrorCode.BAD_REQUEST, "Thiếu số phiếu nhập (referenceCode)");
        }
        String trimmed = referenceCode.trim();
        if (trimmed.length() > REFERENCE_MAX) {
            throw new BusinessException(ErrorCode.BAD_REQUEST, "Số phiếu nhập tối đa " + REFERENCE_MAX + " ký tự");
        }
        return trimmed;
    }

    private Map<String, String> ownMeta(UUID importId, AuthUser user) {
        Map<String, String> meta = importStore.loadMeta(importId).orElse(Map.of());
        if (!KIND.equals(meta.get(ImportStore.META_KIND))
                || !user.id().toString().equals(meta.get(ImportStore.META_USER_ID))) {
            throw notFound(importId);
        }
        return meta;
    }

    private byte[] load(UUID importId) {
        return importStore.load(importId).orElseThrow(() -> notFound(importId));
    }

    private static BusinessException notFound(UUID importId) {
        return new BusinessException(ErrorCode.NOT_FOUND,
                "Không tìm thấy file import " + importId + " (file chỉ giữ 1 giờ sau khi kiểm tra), hãy upload lại");
    }

    // ------------------------------------------------------------------ export (EXP-3)

    private static final ExcelSheetSpec EXPORT_SPEC = ExcelSheetSpec.of("Tồn kho", List.of(
            ColumnDef.text("warehouse", "Mã kho").width(14),
            ColumnDef.text("warehouseName", "Tên kho").width(28),
            ColumnDef.text("sku", "SKU").asText().width(24),
            ColumnDef.integer("quantity", "Tồn"),
            ColumnDef.integer("reserved", "Đang giữ"),
            ColumnDef.integer("available", "Có thể bán"),
            ColumnDef.integer("minQuantity", "Ngưỡng cảnh báo")));

    /** Cùng bộ lọc với GET /admin/inventory. */
    public ExcelFile export(Long warehouseId, boolean lowStock) {
        List<Inventory> found = inventories.search(warehouseId, lowStock).range(0, maxExportRows).list();
        if (found.size() > maxExportRows) {
            throw new BusinessException(ErrorCode.BAD_REQUEST,
                    "Quá " + maxExportRows + " dòng tồn kho, hãy lọc theo kho");
        }
        Map<Long, Warehouse> byId = new HashMap<>();
        warehouses.listAll().forEach(w -> byId.put(w.id, w));
        List<Map<String, Object>> rows = new ArrayList<>(found.size());
        for (Inventory inv : found) {
            Warehouse w = byId.get(inv.warehouseId);
            Map<String, Object> row = new HashMap<>();
            row.put("warehouse", w == null ? String.valueOf(inv.warehouseId) : w.code);
            row.put("warehouseName", w == null ? null : w.name);
            row.put("sku", inv.sku);
            row.put("quantity", inv.quantity);
            row.put("reserved", inv.reservedQuantity);
            row.put("available", inv.available());
            row.put("minQuantity", inv.minQuantity);
            rows.add(row);
        }
        try {
            byte[] content = ExcelWriter.write(EXPORT_SPEC, rows, Map.of(), ExcelMessages.VI, 0);
            return new ExcelFile(lowStock ? "Tồn kho sắp hết.xlsx" : "Tồn kho.xlsx", content);
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
    }
}
