package com.pcshop.inventory;

import com.pcshop.common.quarkus.CurrentUser;
import com.pcshop.contracts.AuthUser;
import com.pcshop.contracts.BusinessException;
import com.pcshop.contracts.ErrorCode;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;

/**
 * Nghiệp vụ thay đổi số lượng tồn kho. Mọi thay đổi đều ghi một dòng stock_movements trong cùng transaction.
 */
@ApplicationScoped
public class InventoryService {

    public record ImportLine(String sku, String productId, int quantity) {
    }

    /** Một dòng nhập kho, mỗi dòng có kho và ghi chú riêng (phiếu nhập từ Excel). */
    public record StockLine(Long warehouseId, String sku, String productId, int quantity, String note) {
    }

    /** {@code createdRows}: số dòng tồn kho (SKU + kho) mới được tạo. */
    public record StockImportResult(int createdRows, List<Inventory> inventories) {
    }

    @Inject
    InventoryRepository inventories;

    @Inject
    WarehouseRepository warehouses;

    @Inject
    StockMovementRepository movements;

    @Inject
    CurrentUser currentUser;

    /**
     * Nhập kho nhiều dòng vào một kho; SKU chưa có dòng tồn kho ở kho này thì tạo mới.
     * product_id là tham chiếu logic sang catalog, không bắt buộc (seed cũng để rỗng).
     */
    @Transactional
    public List<Inventory> importStock(Long warehouseId, String referenceCode, String note, List<ImportLine> lines) {
        AuthUser user = currentUser.requirePermission("inventory:write");
        List<StockLine> stockLines = lines.stream()
                .map(l -> new StockLine(warehouseId, l.sku(), l.productId(), l.quantity(), note))
                .toList();
        return importLines(user, referenceCode, stockLines).inventories();
    }

    /**
     * Nhập kho nhiều dòng, mỗi dòng một kho (IMP-2), trong MỘT transaction: lỗi ở dòng nào thì không ghi gì.
     * Flush ngay trong method để xung đột optimistic lock (version) bật ra ở đây, bên gọi đổi thành lỗi "thử lại".
     */
    @Transactional
    public StockImportResult importStockLines(String referenceCode, List<StockLine> lines) {
        AuthUser user = currentUser.requirePermission("inventory:write");
        StockImportResult result = importLines(user, referenceCode, lines);
        inventories.flush();
        return result;
    }

    private StockImportResult importLines(AuthUser user, String referenceCode, List<StockLine> lines) {
        Set<Long> warehouseIds = new LinkedHashSet<>();
        lines.forEach(l -> warehouseIds.add(l.warehouseId()));
        warehouseIds.forEach(this::requireActiveWarehouse);

        List<Inventory> result = new ArrayList<>();
        int created = 0;
        for (StockLine line : lines) {
            Inventory row = inventories.findBySkuAndWarehouse(line.sku(), line.warehouseId()).orElse(null);
            if (row == null) {
                row = new Inventory();
                row.sku = line.sku();
                row.productId = line.productId() == null ? "" : line.productId();
                row.warehouseId = line.warehouseId();
                inventories.persist(row);
                created++;
            }
            row.quantity += line.quantity();
            recordMovement(user, row, StockMovement.IMPORT, line.quantity(), "IMPORT", referenceCode, line.note());
            result.add(row);
        }
        return new StockImportResult(created, result);
    }

    /** Điều chỉnh tăng/giảm một dòng tồn kho (kiểm kê, hàng hỏng...). */
    @Transactional
    public Inventory adjust(String sku, Long warehouseId, int delta, String note) {
        AuthUser user = currentUser.requirePermission("inventory:write");
        if (warehouseId == null) {
            throw new BusinessException(ErrorCode.BAD_REQUEST, "Thiếu warehouseId");
        }
        if (delta == 0) {
            throw new BusinessException(ErrorCode.BAD_REQUEST, "delta phải khác 0");
        }
        Inventory row = inventories.findBySkuAndWarehouse(sku, warehouseId)
                .orElseThrow(() -> BusinessException.notFound("tồn kho", sku + " @ kho " + warehouseId));
        if (row.quantity + delta < row.reservedQuantity) {
            throw new BusinessException(ErrorCode.BAD_REQUEST, "Không thể giảm dưới số lượng đang được giữ");
        }
        row.quantity += delta;
        recordMovement(user, row, StockMovement.ADJUST, delta, "ADJUST", null, note);
        return row;
    }

    private void recordMovement(AuthUser user, Inventory row, int type, int quantity,
                                String referenceType, String referenceCode, String note) {
        StockMovement m = new StockMovement();
        m.sku = row.sku;
        m.warehouseId = row.warehouseId;
        m.type = type;
        m.quantity = quantity;
        m.quantityAfter = row.quantity;
        m.referenceType = referenceType;
        m.referenceCode = referenceCode;
        m.note = note;
        m.createdBy = user.id();
        m.createdAt = LocalDateTime.now();
        movements.persist(m);
    }

    private void requireActiveWarehouse(Long warehouseId) {
        Warehouse w = warehouses.findByIdOptional(warehouseId)
                .orElseThrow(() -> BusinessException.notFound("kho", warehouseId));
        if (w.isActive != 1) {
            throw new BusinessException(ErrorCode.BAD_REQUEST, "Kho " + w.code + " đã ngừng hoạt động");
        }
    }
}
