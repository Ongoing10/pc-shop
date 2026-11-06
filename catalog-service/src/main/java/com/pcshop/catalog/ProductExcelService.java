package com.pcshop.catalog;

import com.pcshop.common.quarkus.CurrentUser;
import com.pcshop.contracts.AuthUser;
import com.pcshop.contracts.BusinessException;
import com.pcshop.contracts.ErrorCode;
import com.pcshop.excel.ExcelMessages;
import com.pcshop.excel.dto.ImportPolicy;
import com.pcshop.excel.dto.ImportResults;
import com.pcshop.excel.dto.ImportResults.ImportResult;
import com.pcshop.excel.dto.ImportResults.RowError;
import com.pcshop.excel.dto.ImportResults.ValidateResult;
import com.pcshop.excel.dto.MapImportRow;
import com.pcshop.excel.engine.ColumnDef;
import com.pcshop.excel.engine.ColumnType;
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
import org.bson.Document;
import org.eclipse.microprofile.config.inject.ConfigProperty;
import org.jboss.logging.Logger;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.regex.Pattern;

/**
 * Import/Export sản phẩm bằng Excel theo danh mục (IMP-1, EXP-2). Cột của file = cột cố định + cột động theo
 * {@code spec_schema} của danh mục; file export dùng đúng định dạng file mẫu để sửa rồi import lại bằng UPSERT.
 * Quyền: product:write. Ghi từng dòng độc lập (dòng lỗi không chặn dòng khác).
 */
@ApplicationScoped
public class ProductExcelService {

    private static final Logger log = Logger.getLogger(ProductExcelService.class);

    static final String KIND = "catalog.product";
    private static final String META_CATEGORY = "category";
    private static final Pattern SKU = Pattern.compile("^[A-Z0-9][A-Z0-9-]{2,49}$");

    // Key cột cố định; cột động có key "<group>.<key>" (vd compat.socket)
    private static final String SKU_COL = "sku";
    private static final String NAME = "name";
    private static final String BRAND = "brand";
    private static final String PRICE = "price";
    private static final String ORIGINAL_PRICE = "original_price";
    private static final String SHORT_DESCRIPTION = "short_description";
    private static final String WARRANTY = "warranty_months";
    private static final String TAGS = "tags";
    private static final String STATUS = "status";

    /** Chữ hiển thị của trạng thái theo thứ tự Product.DRAFT..DISCONTINUED. */
    private static final List<String> STATUS_TEXT = List.of("Nháp", "Đang bán", "Đã ẩn", "Ngừng bán");

    public record ExcelFile(String filename, byte[] content) {
    }

    /** Một dòng đã kiểm tra xong, sẵn sàng ghi. */
    private record Planned(MapImportRow row, ProductService.ProductInput input, Product existing) {
    }

    @Inject
    CatalogRepositories.CategoryRepository categories;

    @Inject
    CatalogRepositories.BrandRepository brands;

    @Inject
    CatalogRepositories.ProductRepository products;

    @Inject
    ProductService productService;

    @Inject
    CurrentUser currentUser;

    @Inject
    ImportStore importStore;

    @ConfigProperty(name = "pcshop.import.max-rows", defaultValue = "1000")
    int maxRows;

    @ConfigProperty(name = "pcshop.excel.max-export-rows", defaultValue = "10000")
    int maxExportRows;

    // ------------------------------------------------------------------ API

    public ExcelFile template(String categoryCode) {
        currentUser.requirePermission("product:write");
        Category category = activeCategory(categoryCode);
        ExcelSheetSpec spec = spec(category);
        ExcelGuide guide = new ExcelGuide("Mẫu nhập sản phẩm - " + category.name + " (" + category.code + ")",
                List.of("Mỗi file chỉ nhập sản phẩm của MỘT danh mục: " + category.code + ".",
                        "Cột có dấu (*) là bắt buộc. Cột có danh sách thả xuống chỉ nhận giá trị trong danh sách.",
                        "Cột nhiều giá trị (vd Chuẩn RAM hỗ trợ) ghi cách nhau dấu phẩy: DDR4, DDR5.",
                        "Giá tính bằng VND. Giá gốc (nếu có) phải lớn hơn hoặc bằng giá bán.",
                        "Trạng thái: sản phẩm mới chỉ nhận Nháp hoặc Đang bán (để trống = Nháp). "
                                + "Khi cập nhật (mode UPSERT), cột Trạng thái được bỏ qua: đổi trạng thái ở trang quản trị.",
                        "Khi cập nhật, ảnh và mô tả chi tiết của sản phẩm được giữ nguyên.",
                        "Dữ liệu nhập từ dòng 2 của sheet đầu tiên; không đổi tên, thứ tự cột."),
                example(category));
        try {
            byte[] content = ExcelWriter.writeTemplate(spec, references(category), ExcelMessages.VI, guide);
            return new ExcelFile("Mẫu nhập sản phẩm - " + category.code + ".xlsx", content);
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
    }

    public ValidateResult validate(byte[] content, String categoryCode, String mode) {
        AuthUser user = currentUser.requirePermission("product:write");
        ImportPolicy policy = policy(mode);
        Category category = activeCategory(categoryCode);
        List<MapImportRow> rows = read(content, category);
        List<Planned> planned = check(rows, category, policy);

        Map<String, String> meta = Map.of(ImportStore.META_USER_ID, user.id().toString(),
                ImportStore.META_KIND, KIND, ImportStore.META_MODE, policy.name(), META_CATEGORY, category.code);
        UUID importId = importStore.save(content, meta);

        List<Map<String, Object>> preview = new ArrayList<>();
        for (Planned p : planned) {
            if (preview.size() >= ImportResults.PREVIEW_ROWS) {
                break;
            }
            Map<String, Object> item = new LinkedHashMap<>();
            item.put("row", p.row().getRow() + 1);
            item.put("action", p.existing() == null ? "CREATE" : "UPDATE");
            item.putAll(p.row().getValues());
            preview.add(item);
        }
        int invalid = (int) ImportResults.invalidCount(rows);
        return new ValidateResult(importId, policy.name(), rows.size(), rows.size() - invalid, invalid,
                ImportResults.errors(rows), preview);
    }

    /** File người dùng đã upload, thêm cột "Lỗi" (kiểm tra lại với dữ liệu hiện tại). */
    public ExcelFile resultFile(UUID importId) {
        AuthUser user = currentUser.requirePermission("product:write");
        Map<String, String> meta = ownMeta(importId, user);
        byte[] content = load(importId);
        Category category = activeCategory(meta.get(META_CATEGORY));
        List<MapImportRow> rows = read(content, category);
        check(rows, category, ImportPolicy.parse(meta.get(ImportStore.META_MODE)));
        return new ExcelFile("Kết quả kiểm tra - " + category.code + ".xlsx",
                ExcelResultWriter.withErrors(content, ImportResults.errorsByRow(rows)));
    }

    /** Đọc lại file đã validate, kiểm tra lại từ đầu rồi ghi từng dòng hợp lệ. Xong thì xóa file tạm. */
    public ImportResult importFile(UUID importId) {
        AuthUser user = currentUser.requirePermission("product:write");
        Map<String, String> meta = ownMeta(importId, user);
        byte[] content = load(importId);
        Category category = activeCategory(meta.get(META_CATEGORY));
        List<MapImportRow> rows = read(content, category);
        List<Planned> planned = check(rows, category, ImportPolicy.parse(meta.get(ImportStore.META_MODE)));

        int created = 0;
        int updated = 0;
        List<RowError> errors = new ArrayList<>(ImportResults.errors(rows));
        for (Planned p : planned) {
            try {
                if (productService.saveImported(p.input(), p.existing(), user) == ProductService.ImportOutcome.CREATED) {
                    created++;
                } else {
                    updated++;
                }
            } catch (RuntimeException e) {
                // dòng này lỗi khi ghi (vd slug vừa bị người khác dùng): ghi nhận, các dòng khác vẫn chạy
                log.warnf(e, "Import sản phẩm %s (dòng %d) lỗi", p.input().sku(), p.row().getRow() + 1);
                String reason = e instanceof BusinessException ? e.getMessage() : "Lỗi khi lưu: " + e.getMessage();
                errors.add(new RowError(p.row().getRow() + 1, List.of(reason)));
            }
        }
        importStore.delete(importId);
        errors.sort((a, b) -> Integer.compare(a.row(), b.row()));
        return new ImportResult(rows.size(), created, updated, rows.size() - created - updated, errors);
    }

    /** EXP-2: cùng định dạng file mẫu, sửa rồi import lại bằng UPSERT. */
    public ExcelFile export(String categoryCode, Integer status) {
        currentUser.requirePermission("product:write");
        if (categoryCode == null || categoryCode.isBlank()) {
            throw new BusinessException(ErrorCode.BAD_REQUEST, "Thiếu category: file export theo một danh mục");
        }
        Category category = categories.findByCode(categoryCode)
                .orElseThrow(() -> BusinessException.notFound("danh mục", categoryCode));
        List<Product> found = products.findForExport(category.code, status, maxExportRows + 1);
        if (found.size() > maxExportRows) {
            throw new BusinessException(ErrorCode.BAD_REQUEST,
                    "Quá " + maxExportRows + " sản phẩm, hãy lọc thêm theo trạng thái");
        }
        ExcelSheetSpec spec = spec(category);
        List<Map<String, Object>> rows = new ArrayList<>(found.size());
        for (Product p : found) {
            rows.add(toRow(p, category));
        }
        try {
            byte[] content = ExcelWriter.write(spec, rows, references(category), ExcelMessages.VI, rows.size());
            return new ExcelFile("Sản phẩm - " + category.code + ".xlsx", content);
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
    }

    // ------------------------------------------------------------------ mô tả cột

    ExcelSheetSpec spec(Category category) {
        List<ColumnDef> columns = new ArrayList<>(List.of(
                ColumnDef.text(SKU_COL, "SKU").asRequired().asText().asCode().width(22)
                        .comment("A-Z, 0-9, dấu -; 3-50 ký tự, vd CPU-I5-14600K"),
                ColumnDef.text(NAME, "Tên sản phẩm").asRequired().width(40),
                ColumnDef.text(BRAND, "Thương hiệu").asRequired().dropdown(BRAND).width(22),
                ColumnDef.decimal(PRICE, "Giá bán").asRequired().asCurrency(),
                ColumnDef.decimal(ORIGINAL_PRICE, "Giá gốc").asCurrency(),
                ColumnDef.text(SHORT_DESCRIPTION, "Mô tả ngắn").width(40),
                ColumnDef.integer(WARRANTY, "Bảo hành (tháng)"),
                ColumnDef.of(TAGS, "Tags", ColumnType.STRING_LIST).width(20),
                ColumnDef.text(STATUS, "Trạng thái").dropdown(STATUS)));
        for (Category.SpecField field : schema(category)) {
            String header = field.unit == null || field.unit.isBlank() ? field.label : field.label + " (" + field.unit + ")";
            ColumnDef column = ColumnDef.of(columnKey(field), header, columnType(field))
                    .required(Boolean.TRUE.equals(field.required));
            if (field.options != null && !field.options.isEmpty()) {
                column = column.dropdown(columnKey(field));
            }
            columns.add(column);
        }
        return ExcelSheetSpec.of(category.code, columns).withMaxRows(maxRows);
    }

    private Map<String, List<ReferenceItem>> references(Category category) {
        Map<String, List<ReferenceItem>> refs = new HashMap<>();
        refs.put(BRAND, brands.listActive().stream().map(b -> new ReferenceItem(null, b.code, b.name)).toList());
        refs.put(STATUS, STATUS_TEXT.stream().map(t -> new ReferenceItem(null, t, null)).toList());
        for (Category.SpecField field : schema(category)) {
            if (field.options != null && !field.options.isEmpty()) {
                refs.put(columnKey(field), field.options.stream().map(o -> new ReferenceItem(null, o, null)).toList());
            }
        }
        return refs;
    }

    private static List<Category.SpecField> schema(Category category) {
        return category.specSchema == null ? List.of() : category.specSchema;
    }

    private static String columnKey(Category.SpecField field) {
        String group = Category.GROUP_COMPAT.equals(field.group) ? Category.GROUP_COMPAT : Category.GROUP_SPECS;
        return group + "." + field.key;
    }

    private static ColumnType columnType(Category.SpecField field) {
        return switch (field.type == null ? "string" : field.type) {
            case "integer" -> ColumnType.INTEGER;
            case "decimal" -> ColumnType.DECIMAL;
            case "boolean" -> ColumnType.BOOLEAN;
            case "string_list" -> ColumnType.STRING_LIST;
            default -> ColumnType.STRING;
        };
    }

    /** Dòng ví dụ cho sheet Hướng dẫn. */
    private Map<String, Object> example(Category category) {
        Map<String, Object> row = new LinkedHashMap<>();
        row.put(SKU_COL, category.code + "-VD-001");
        row.put(NAME, category.name + " mẫu");
        brands.listActive().stream().findFirst().ifPresent(b -> row.put(BRAND, b.code + "|" + b.name));
        row.put(PRICE, new BigDecimal("1990000"));
        row.put(ORIGINAL_PRICE, new BigDecimal("2290000"));
        row.put(SHORT_DESCRIPTION, "Mô tả ngắn hiển thị ở danh sách");
        row.put(WARRANTY, 36);
        row.put(TAGS, List.of("gaming", "2K"));
        row.put(STATUS, STATUS_TEXT.get(0));
        for (Category.SpecField field : schema(category)) {
            Object value;
            if (field.options != null && !field.options.isEmpty()) {
                value = "string_list".equals(field.type) ? field.options.subList(0, Math.min(2, field.options.size()))
                        : field.options.get(0);
            } else {
                value = switch (columnType(field)) {
                    case INTEGER -> 100;
                    case DECIMAL -> new BigDecimal("4.5");
                    case BOOLEAN -> Boolean.TRUE;
                    default -> "...";
                };
            }
            row.put(columnKey(field), value);
        }
        return row;
    }

    // ------------------------------------------------------------------ kiểm tra

    private List<MapImportRow> read(byte[] content, Category category) {
        try {
            return ExcelReader.read(content, spec(category), references(category), ExcelMessages.VI);
        } catch (ExcelFileException e) {
            throw new BusinessException(ErrorCode.BAD_REQUEST, e.getMessage());
        }
    }

    /**
     * Kiểm tra nghiệp vụ từng dòng (lỗi định dạng ô đã có sẵn từ ExcelReader), dựng ProductInput cho dòng hợp lệ.
     * Không ghi DB.
     */
    private List<Planned> check(List<MapImportRow> rows, Category category, ImportPolicy policy) {
        Set<String> skus = new HashSet<>();
        rows.forEach(r -> {
            if (r.getString(SKU_COL) != null) {
                skus.add(r.getString(SKU_COL));
            }
        });
        Map<String, Product> existing = new HashMap<>();
        if (!skus.isEmpty()) {
            products.findBySkus(skus).forEach(p -> existing.put(p.sku, p));
        }
        Set<String> slugsInFile = new HashSet<>();
        List<Planned> planned = new ArrayList<>();

        for (MapImportRow row : rows) {
            String sku = row.getString(SKU_COL);
            Product current = sku == null ? null : existing.get(sku);
            if (sku != null && !SKU.matcher(sku).matches()) {
                row.addError("SKU: chỉ gồm A-Z, 0-9, dấu -, bắt đầu bằng chữ/số, 3-50 ký tự");
            }
            if (current != null && policy == ImportPolicy.CREATE_ONLY) {
                row.addError("SKU: " + sku + " đã tồn tại (chọn mode UPSERT để cập nhật)");
            }
            if (current != null && !category.code.equals(current.categoryCode)) {
                row.addError("SKU: " + sku + " thuộc danh mục " + current.categoryCode + ", không phải " + category.code);
            }
            BigDecimal price = row.getDecimal(PRICE);
            BigDecimal originalPrice = row.getDecimal(ORIGINAL_PRICE);
            if (price != null && price.signum() <= 0) {
                row.addError("Giá bán: phải lớn hơn 0");
            }
            if (price != null && originalPrice != null && originalPrice.compareTo(price) < 0) {
                row.addError("Giá gốc: phải lớn hơn hoặc bằng giá bán");
            }
            Integer warranty = row.getInteger(WARRANTY);
            if (warranty != null && warranty < 0) {
                row.addError("Bảo hành (tháng): không được âm");
            }
            Integer status = statusOf(row.getString(STATUS));
            if (current == null && status != null && status != Product.DRAFT && status != Product.ACTIVE) {
                row.addError("Trạng thái: sản phẩm mới chỉ nhận Nháp hoặc Đang bán");
            }
            if (!row.getIsValid()) {
                continue;
            }

            String slug = current != null ? current.slug : uniqueSlug(row.getString(NAME), slugsInFile);
            planned.add(new Planned(row, toInput(row, category, current, slug, status), current));
        }
        return planned;
    }

    private ProductService.ProductInput toInput(MapImportRow row, Category category, Product current, String slug,
                                                Integer status) {
        Map<String, Object> specs = new LinkedHashMap<>();
        Map<String, Object> compat = new LinkedHashMap<>();
        if (current != null) {
            // giữ các key không có trong spec_schema (vd thông số nhập tay ở trang quản trị)
            if (current.specs != null) {
                specs.putAll(current.specs);
            }
            if (current.compat != null) {
                compat.putAll(current.compat);
            }
        }
        for (Category.SpecField field : schema(category)) {
            Map<String, Object> target = Category.GROUP_COMPAT.equals(field.group) ? compat : specs;
            Object value = row.get(columnKey(field));
            if (value == null) {
                target.remove(field.key);
            } else {
                // decimal lưu dạng double như dữ liệu seed (rule engine đọc qua Number)
                target.put(field.key, value instanceof BigDecimal bd ? bd.doubleValue() : value);
            }
        }
        List<String> tags = row.getList(TAGS);
        return new ProductService.ProductInput(row.getString(SKU_COL), row.getString(NAME), slug, category.code,
                row.getString(BRAND), row.getString(SHORT_DESCRIPTION),
                current == null ? null : current.description,
                row.getDecimal(PRICE), row.getDecimal(ORIGINAL_PRICE),
                current == null ? null : current.images,
                specs, compat.isEmpty() && current == null ? null : compat,
                tags == null ? List.of() : tags, row.getInteger(WARRANTY),
                current == null ? (status == null ? Product.DRAFT : status) : null);
    }

    /** Slug từ tên; trùng trong DB hoặc trong file thì thêm -2, -3... */
    private String uniqueSlug(String name, Set<String> slugsInFile) {
        String base = Slugs.of(name);
        String slug = base;
        for (int i = 2; slugsInFile.contains(slug) || products.existsBySlugExcept(slug, null); i++) {
            slug = base + "-" + i;
        }
        slugsInFile.add(slug);
        return slug;
    }

    private static Integer statusOf(String text) {
        int index = text == null ? -1 : STATUS_TEXT.indexOf(text);
        return index < 0 ? null : index + Product.DRAFT;
    }

    private Map<String, Object> toRow(Product p, Category category) {
        Map<String, Object> row = new HashMap<>();
        row.put(SKU_COL, p.sku);
        row.put(NAME, p.name);
        row.put(BRAND, p.brandCode);
        row.put(PRICE, p.price);
        row.put(ORIGINAL_PRICE, p.originalPrice);
        row.put(SHORT_DESCRIPTION, p.shortDescription);
        row.put(WARRANTY, p.warrantyMonths);
        row.put(TAGS, p.tags);
        if (p.status != null && p.status >= Product.DRAFT && p.status <= Product.DISCONTINUED) {
            row.put(STATUS, STATUS_TEXT.get(p.status - Product.DRAFT));
        }
        for (Category.SpecField field : schema(category)) {
            Document source = Category.GROUP_COMPAT.equals(field.group) ? p.compat : p.specs;
            if (source != null && source.get(field.key) != null) {
                row.put(columnKey(field), source.get(field.key));
            }
        }
        return row;
    }

    // ------------------------------------------------------------------ hỗ trợ

    private Category activeCategory(String code) {
        if (code == null || code.isBlank()) {
            throw new BusinessException(ErrorCode.BAD_REQUEST, "Thiếu category");
        }
        return categories.findActiveByCode(code)
                .orElseThrow(() -> new BusinessException(ErrorCode.BAD_REQUEST,
                        "Danh mục không tồn tại hoặc đã ẩn: " + code));
    }

    private static ImportPolicy policy(String mode) {
        try {
            return ImportPolicy.parse(mode);
        } catch (IllegalArgumentException e) {
            throw new BusinessException(ErrorCode.BAD_REQUEST, e.getMessage());
        }
    }

    /** Metadata của file import; chỉ người đã upload mới dùng được importId. */
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
}
