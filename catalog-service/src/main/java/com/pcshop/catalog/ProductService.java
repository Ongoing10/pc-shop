package com.pcshop.catalog;

import com.mongodb.client.MongoCollection;
import com.pcshop.common.quarkus.CurrentUser;
import com.pcshop.contracts.AuthUser;
import com.pcshop.contracts.BulkErrors;
import com.pcshop.contracts.BusinessException;
import com.pcshop.contracts.ErrorCode;
import com.pcshop.contracts.PageResponse;
import io.quarkus.mongodb.panache.PanacheQuery;
import io.quarkus.panache.common.Page;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import org.bson.Document;
import org.bson.conversions.Bson;
import org.bson.types.Decimal128;
import org.jboss.logging.Logger;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.TreeSet;
import java.util.regex.Pattern;

/**
 * Truy vấn và quản trị sản phẩm. Bộ lọc động dựng bằng Document của Mongo (tham số đều đi qua giá trị,
 * không ghép chuỗi query nên không bị chèn toán tử).
 */
@ApplicationScoped
public class ProductService {

    private static final Logger log = Logger.getLogger(ProductService.class);

    /** Bộ lọc của trang danh sách sản phẩm (công khai, chỉ ACTIVE). */
    public record ProductFilter(String category, String brand, BigDecimal minPrice, BigDecimal maxPrice, String sort,
                                String socket, String memoryType, String formFactor) {
    }

    /** Thông tin rút gọn cho API nội bộ (cart, ordering): đủ để hiển thị giỏ và chụp snapshot order_items. */
    public record ProductSummary(String productId, String sku, String name, String slug, String categoryCode,
                                 String brandCode, BigDecimal price, BigDecimal originalPrice, String imageUrl,
                                 Integer status, Integer warrantyMonths) {
    }

    public record PriceRange(BigDecimal min, BigDecimal max) {
    }

    public record Facets(List<String> brands, PriceRange priceRange, Map<String, List<String>> compat) {
    }

    /** Dữ liệu nhập khi tạo/sửa sản phẩm (sku, price, status chỉ dùng lúc tạo). */
    public record ProductInput(String sku, String name, String slug, String categoryCode, String brandCode,
                               String shortDescription, String description, BigDecimal price,
                               BigDecimal originalPrice, List<Product.Image> images, Map<String, Object> specs,
                               Map<String, Object> compat, List<String> tags, Integer warrantyMonths,
                               Integer status) {
    }

    /** Một dòng của API đổi giá hàng loạt. */
    public record PriceInput(String sku, BigDecimal price, BigDecimal originalPrice) {
    }

    public record BulkSaveResult(int created, int updated, List<Product> products) {
    }

    /** Kết quả ghi một dòng import Excel. */
    public enum ImportOutcome { CREATED, UPDATED }

    @Inject
    CatalogRepositories.ProductRepository products;

    @Inject
    CatalogRepositories.CategoryRepository categories;

    @Inject
    CatalogRepositories.BrandRepository brands;

    @Inject
    CatalogRepositories.PriceHistoryRepository priceHistories;

    @Inject
    CurrentUser currentUser;

    // ------------------------------------------------------------------ công khai

    public PageResponse<Product> searchActive(ProductFilter f, int page, int size) {
        Document query = new Document("status", Product.ACTIVE);
        putIfPresent(query, "category_code", f.category());
        putIfPresent(query, "brand_code", f.brand());
        Document price = new Document();
        if (f.minPrice() != null) {
            price.append("$gte", new Decimal128(f.minPrice()));
        }
        if (f.maxPrice() != null) {
            price.append("$lte", new Decimal128(f.maxPrice()));
        }
        if (!price.isEmpty()) {
            query.append("price", price);
        }
        List<Document> and = new ArrayList<>();
        if (notBlank(f.socket())) {
            and.add(anyOf("compat.socket", "compat.supported_sockets", f.socket()));
        }
        if (notBlank(f.memoryType())) {
            // CPU khai danh sách memory_types, mainboard/RAM khai một memory_type
            and.add(anyOf("compat.memory_type", "compat.memory_types", f.memoryType()));
        }
        if (notBlank(f.formFactor())) {
            // mainboard/PSU khai form_factor, case khai danh sách supported_form_factors
            and.add(anyOf("compat.form_factor", "compat.supported_form_factors", f.formFactor()));
        }
        if (!and.isEmpty()) {
            query.append("$and", and);
        }
        return page(products.find(query, sortOf(f.sort())), page, size);
    }

    /** Tìm theo text index (name, short_description, tags), xếp theo độ khớp. */
    public PageResponse<Product> fullTextSearch(String q, int page, int size) {
        if (!notBlank(q)) {
            throw new BusinessException(ErrorCode.BAD_REQUEST, "Thiếu từ khóa q");
        }
        Document query = new Document("$text", new Document("$search", q)).append("status", Product.ACTIVE);
        Document sort = new Document("score", new Document("$meta", "textScore"));
        return page(products.find(query, sort), page, size);
    }

    /** Giá trị cho bộ lọc của một danh mục (chỉ tính sản phẩm ACTIVE). */
    public Facets facets(String category) {
        Document filter = new Document("status", Product.ACTIVE);
        putIfPresent(filter, "category_code", category);
        MongoCollection<Product> col = products.mongoCollection();

        List<String> brandCodes = col.distinct("brand_code", filter, String.class).into(new ArrayList<>());
        brandCodes.removeIf(b -> b == null);
        brandCodes.sort(String::compareTo);

        Product cheapest = products.find(filter, new Document("price", 1)).firstResult();
        Product priciest = products.find(filter, new Document("price", -1)).firstResult();
        PriceRange range = new PriceRange(cheapest == null ? null : cheapest.price,
                priciest == null ? null : priciest.price);

        Map<String, List<String>> compat = new java.util.LinkedHashMap<>();
        putFacet(compat, "socket", col, filter, "compat.socket", "compat.supported_sockets");
        putFacet(compat, "memoryType", col, filter, "compat.memory_type", "compat.memory_types");
        putFacet(compat, "formFactor", col, filter, "compat.form_factor", "compat.supported_form_factors");
        return new Facets(brandCodes, range, compat);
    }

    /** Nhiều SKU một lần; bỏ qua DRAFT (chưa công bố). Bên gọi tự xử lý SKU không có trong kết quả. */
    public List<ProductSummary> batch(List<String> skus) {
        return products.findBySkus(new TreeSet<>(skus)).stream()
                .filter(p -> p.status != null && p.status != Product.DRAFT)
                .map(ProductService::summary)
                .toList();
    }

    public List<PriceHistory> priceHistory(String sku) {
        products.findActiveBySku(sku).orElseThrow(() -> BusinessException.notFound("sản phẩm", sku));
        return priceHistories.listBySku(sku, 100);
    }

    // ------------------------------------------------------------------ admin (permission product:write)

    public PageResponse<Product> adminSearch(Integer status, String category, String q, int page, int size) {
        currentUser.requirePermission("product:write");
        Document query = new Document();
        if (status != null) {
            query.append("status", status);
        }
        putIfPresent(query, "category_code", category);
        if (notBlank(q)) {
            Document regex = new Document("$regex", Pattern.quote(q.trim())).append("$options", "i");
            query.append("$or", List.of(new Document("name", regex), new Document("sku", regex)));
        }
        return page(products.find(query, new Document("updated_at", -1).append("sku", 1)), page, size);
    }

    public Product create(ProductInput in) {
        AuthUser user = currentUser.requirePermission("product:write");
        if (products.findBySku(in.sku()).isPresent()) {
            throw new BusinessException(ErrorCode.CONFLICT, "SKU đã tồn tại: " + in.sku());
        }
        Product p = newProduct(in, user);
        applyInput(p, in, null);
        products.persist(p);
        recordPrice(p, null, p.price, "INITIAL", user);
        // TODO (đợt 2): status ACTIVE → bắn event product.updated cho ai-service
        return p;
    }

    /** Chi tiết cho trang sửa của admin: thấy cả DRAFT/HIDDEN/DISCONTINUED. */
    public Product adminGet(String sku) {
        currentUser.requirePermission("product:write");
        return findBySku(sku);
    }

    public Product update(String sku, ProductInput in) {
        AuthUser user = currentUser.requirePermission("product:write");
        Product p = findBySku(sku);
        applyInput(p, in, sku);
        touch(p, user);
        products.updateEditable(p);
        // TODO (đợt 2): bắn event product.updated cho ai-service (re-embed nếu content_hash đổi)
        return p;
    }

    public Product changeStatus(String sku, int status) {
        AuthUser user = currentUser.requirePermission("product:write");
        Product p = findBySku(sku);
        checkStatus(p, status);
        boolean hiding = applyStatus(p, status, user);
        products.updateEditable(p);
        if (hiding) {
            notifyHidden(p);
        }
        return p;
    }

    /**
     * Tạo mới hoặc sửa thông tin nhiều sản phẩm (nhập catalog), "tất cả hoặc không".
     * SKU đã có: sửa thông tin, đổi giá nếu {@code price} khác (ghi price_histories), KHÔNG đổi trạng thái.
     * SKU chưa có: tạo mới như {@link #create}. Mongo standalone không có transaction: kiểm tra hết rồi mới ghi;
     * nếu Mongo lỗi giữa bước ghi thì có thể chỉ một phần được lưu (log lại để xử lý tay).
     */
    public BulkSaveResult saveAll(List<ProductInput> inputs) {
        AuthUser user = currentUser.requirePermission("product:write");
        List<String> skus = inputs.stream().map(ProductInput::sku).toList();
        BulkErrors errors = BulkErrors.check(skus);
        Map<String, Product> existing = new LinkedHashMap<>();
        products.findBySkus(skus).forEach(p -> existing.put(p.sku, p));

        List<Product> toCreate = new ArrayList<>();
        List<Product> toUpdate = new ArrayList<>();
        Map<String, BigDecimal> oldPrices = new LinkedHashMap<>();
        Set<String> slugs = new HashSet<>();
        for (ProductInput in : inputs) {
            errors.tryRun(in.sku(), () -> {
                Product p = existing.get(in.sku());
                boolean isNew = p == null;
                if (isNew) {
                    p = newProduct(in, user);
                }
                applyInput(p, in, isNew ? null : in.sku());
                if (!slugs.add(p.slug)) {
                    throw new BusinessException(ErrorCode.CONFLICT, "Slug bị trùng trong danh sách: " + p.slug);
                }
                if (isNew) {
                    toCreate.add(p);
                    return;
                }
                if (in.price() != null && (p.price == null || p.price.compareTo(in.price()) != 0)) {
                    oldPrices.put(p.sku, p.price);
                    p.price = in.price();
                }
                touch(p, user);
                toUpdate.add(p);
            });
        }
        errors.throwIfAny();

        try {
            if (!toCreate.isEmpty()) {
                products.persist(toCreate);
            }
            if (!toUpdate.isEmpty()) {
                products.updateEditable(toUpdate);
            }
        } catch (RuntimeException e) {
            log.errorf(e, "Lưu hàng loạt %d sản phẩm lỗi giữa chừng, kiểm tra lại các SKU %s", inputs.size(), skus);
            throw e;
        }
        toCreate.forEach(p -> recordPrice(p, null, p.price, "INITIAL", user));
        toUpdate.stream().filter(p -> oldPrices.containsKey(p.sku))
                .forEach(p -> recordPrice(p, oldPrices.get(p.sku), p.price, "BULK_IMPORT", user));
        List<Product> saved = new ArrayList<>(toCreate);
        saved.addAll(toUpdate);
        return new BulkSaveResult(toCreate.size(), toUpdate.size(), saved);
    }

    /**
     * Ghi MỘT dòng import Excel (IMP-1): mỗi dòng độc lập, khác {@link #saveAll} ("tất cả hoặc không").
     * Bên gọi đã kiểm tra quyền và dữ liệu, và dựng {@code in} đầy đủ: với sản phẩm đã có, {@code in} mang sẵn
     * images/description/slug cũ và specs/compat đã gộp (file Excel không có các cột đó).
     * Sửa: KHÔNG đổi trạng thái; giá đổi thì ghi price_histories reason IMPORT.
     */
    public ImportOutcome saveImported(ProductInput in, Product existing, AuthUser user) {
        if (existing == null) {
            Product p = newProduct(in, user);
            applyInput(p, in, null);
            products.persist(p);
            recordPrice(p, null, p.price, "INITIAL", user);
            // TODO (đợt 2): status ACTIVE → bắn event product.updated cho ai-service
            return ImportOutcome.CREATED;
        }
        applyInput(existing, in, existing.sku);
        BigDecimal oldPrice = existing.price;
        boolean priceChanged = in.price() != null && (oldPrice == null || oldPrice.compareTo(in.price()) != 0);
        if (priceChanged) {
            existing.price = in.price();
        }
        touch(existing, user);
        products.updateEditable(existing);
        if (priceChanged) {
            recordPrice(existing, oldPrice, existing.price, "IMPORT", user);
        }
        // TODO (đợt 2): bắn event product.updated cho ai-service (re-embed nếu content_hash đổi)
        return ImportOutcome.UPDATED;
    }

    /** Đổi trạng thái nhiều sản phẩm (thay cho xóa hàng loạt), "tất cả hoặc không". */
    public List<Product> changeStatusAll(List<String> skus, int status) {
        AuthUser user = currentUser.requirePermission("product:write");
        BulkErrors errors = BulkErrors.check(skus);
        List<Product> found = products.findBySkus(skus);
        missing(skus, found, errors);
        for (Product p : found) {
            errors.tryRun(p.sku, () -> checkStatus(p, status));
        }
        errors.throwIfAny();
        List<Product> hidden = found.stream().filter(p -> applyStatus(p, status, user)).toList();
        products.updateEditable(found);
        hidden.forEach(this::notifyHidden);
        return found;
    }

    /** Đổi giá nhiều sản phẩm cùng một lý do (vd khuyến mãi), "tất cả hoặc không". */
    public List<Product> changePriceAll(List<PriceInput> items, String reason) {
        AuthUser user = currentUser.requirePermission("product:write");
        List<String> skus = items.stream().map(PriceInput::sku).toList();
        BulkErrors errors = BulkErrors.check(skus);
        Map<String, Product> found = new LinkedHashMap<>();
        products.findBySkus(skus).forEach(p -> found.put(p.sku, p));
        missing(skus, List.copyOf(found.values()), errors);
        for (PriceInput item : items) {
            Product p = found.get(item.sku());
            if (p != null) {
                errors.tryRun(item.sku(), () -> checkPriceChanged(p, item.price(), item.originalPrice()));
            }
        }
        errors.throwIfAny();
        Map<String, BigDecimal> oldPrices = new LinkedHashMap<>();
        for (PriceInput item : items) {
            Product p = found.get(item.sku());
            oldPrices.put(p.sku, p.price);
            applyPrice(p, item.price(), item.originalPrice(), user);
        }
        List<Product> changed = List.copyOf(found.values());
        products.updateEditable(changed);
        for (Product p : changed) {
            BigDecimal old = oldPrices.get(p.sku);
            if (old == null || old.compareTo(p.price) != 0) {
                recordPrice(p, old, p.price, reason, user);
            }
        }
        return changed;
    }

    /**
     * Đổi giá: cập nhật products.price rồi ghi thêm price_histories.
     * Mongo standalone không có transaction nhiều document; nếu bước ghi lịch sử lỗi thì log lại để xử lý tay.
     */
    public Product changePrice(String sku, BigDecimal newPrice, BigDecimal originalPrice, String reason) {
        AuthUser user = currentUser.requirePermission("product:write");
        Product p = findBySku(sku);
        checkPriceChanged(p, newPrice, originalPrice);
        BigDecimal oldPrice = p.price;
        applyPrice(p, newPrice, originalPrice, user);
        products.updateEditable(p);
        if (oldPrice == null || oldPrice.compareTo(newPrice) != 0) {
            recordPrice(p, oldPrice, newPrice, reason, user);
        }
        // TODO (đợt 2): bắn event product.updated (giá không lấy từ vector store nhưng metadata hiển thị có giá)
        return p;
    }

    // ------------------------------------------------------------------ nội bộ

    public static ProductSummary summary(Product p) {
        return new ProductSummary(p.id == null ? null : p.id.toHexString(), p.sku, p.name, p.slug, p.categoryCode,
                p.brandCode, p.price, p.originalPrice, p.primaryImageUrl(), p.status, p.warrantyMonths);
    }

    private Product newProduct(ProductInput in, AuthUser user) {
        if (in.price() == null) {
            throw new BusinessException(ErrorCode.BAD_REQUEST, "Sản phẩm mới phải có giá");
        }
        int status = in.status() == null ? Product.DRAFT : in.status();
        if (status != Product.DRAFT && status != Product.ACTIVE) {
            throw new BusinessException(ErrorCode.BAD_REQUEST, "Sản phẩm mới chỉ được ở trạng thái DRAFT(1) hoặc ACTIVE(2)");
        }
        Product p = new Product();
        p.sku = in.sku();
        p.price = in.price();
        p.status = status;
        p.ratingCount = 0;
        p.soldCount = 0;
        Instant now = Instant.now();
        p.createdBy = user.id().toString();
        p.createdAt = now;
        p.updatedBy = p.createdBy;
        p.updatedAt = now;
        return p;
    }

    private static void checkStatus(Product p, int status) {
        if (status < Product.DRAFT || status > Product.DISCONTINUED) {
            throw new BusinessException(ErrorCode.BAD_REQUEST, "Trạng thái không hợp lệ: " + status);
        }
        if (status == Product.DRAFT && p.status != Product.DRAFT) {
            throw new BusinessException(ErrorCode.BAD_REQUEST, "Sản phẩm đã công bố không thể quay về DRAFT");
        }
    }

    /** Gán trạng thái mới; trả true nếu sản phẩm vừa bị ẩn/ngừng bán (cần bắn product.hidden). */
    private static boolean applyStatus(Product p, int status, AuthUser user) {
        boolean hiding = (status == Product.HIDDEN || status == Product.DISCONTINUED)
                && (p.status == Product.ACTIVE || p.status == Product.DRAFT);
        p.status = status;
        touch(p, user);
        return hiding;
    }

    private void notifyHidden(Product p) {
        // TODO (đợt 2): bắn event product.hidden → ai-service xóa thật chunk của sản phẩm khỏi pgvector
        log.infof("Sản phẩm %s chuyển sang trạng thái %d: cần bắn event product.hidden (chưa có Kafka)", p.sku, p.status);
    }

    private static void checkPriceChanged(Product p, BigDecimal newPrice, BigDecimal originalPrice) {
        if (newPrice == null || newPrice.signum() <= 0) {
            throw new BusinessException(ErrorCode.BAD_REQUEST, "Giá phải lớn hơn 0");
        }
        if (p.price != null && p.price.compareTo(newPrice) == 0
                && (originalPrice == null || originalPrice.equals(p.originalPrice))) {
            throw new BusinessException(ErrorCode.BAD_REQUEST, "Giá không thay đổi");
        }
    }

    private static void applyPrice(Product p, BigDecimal newPrice, BigDecimal originalPrice, AuthUser user) {
        p.price = newPrice;
        if (originalPrice != null) {
            p.originalPrice = originalPrice;
        }
        touch(p, user);
    }

    private static void missing(List<String> skus, List<Product> found, BulkErrors errors) {
        Set<String> foundSkus = new HashSet<>();
        found.forEach(p -> foundSkus.add(p.sku));
        skus.stream().filter(sku -> !foundSkus.contains(sku))
                .forEach(sku -> errors.add(sku, "Không tìm thấy sản phẩm"));
    }

    private Product findBySku(String sku) {
        return products.findBySku(sku).orElseThrow(() -> BusinessException.notFound("sản phẩm", sku));
    }

    private void applyInput(Product p, ProductInput in, String exceptSku) {
        categories.findActiveByCode(in.categoryCode())
                .orElseThrow(() -> new BusinessException(ErrorCode.BAD_REQUEST,
                        "Danh mục không tồn tại hoặc đã ẩn: " + in.categoryCode()));
        if (notBlank(in.brandCode())) {
            brands.findActiveByCode(in.brandCode())
                    .orElseThrow(() -> new BusinessException(ErrorCode.BAD_REQUEST,
                            "Thương hiệu không tồn tại hoặc đã ẩn: " + in.brandCode()));
        }
        String slug = Slugs.orFrom(in.slug(), in.name());
        if (products.existsBySlugExcept(slug, exceptSku)) {
            throw new BusinessException(ErrorCode.CONFLICT, "Slug đã được dùng: " + slug);
        }
        p.name = in.name();
        p.slug = slug;
        p.categoryCode = in.categoryCode();
        p.brandCode = notBlank(in.brandCode()) ? in.brandCode() : null;
        p.shortDescription = in.shortDescription();
        p.description = in.description();
        p.originalPrice = in.originalPrice();
        p.images = in.images();
        p.specs = in.specs() == null ? new Document() : new Document(in.specs());
        p.compat = in.compat() == null ? null : new Document(in.compat());
        p.tags = in.tags();
        p.warrantyMonths = in.warrantyMonths();
    }

    private void recordPrice(Product p, BigDecimal oldPrice, BigDecimal newPrice, String reason, AuthUser user) {
        try {
            PriceHistory h = new PriceHistory();
            h.productId = p.id;
            h.sku = p.sku;
            h.oldPrice = oldPrice;
            h.newPrice = newPrice;
            h.reason = reason;
            h.changedBy = user.id().toString();
            h.changedAt = Instant.now();
            priceHistories.persist(h);
        } catch (RuntimeException e) {
            log.errorf(e, "Đã đổi giá %s (%s → %s) nhưng không ghi được price_histories", p.sku, oldPrice, newPrice);
            throw e;
        }
    }

    private static void touch(Product p, AuthUser user) {
        p.updatedBy = user.id().toString();
        p.updatedAt = Instant.now();
    }

    private static Document sortOf(String sort) {
        if (!notBlank(sort)) {
            return new Document("price", 1);
        }
        String[] parts = sort.split(",");
        String field = switch (parts[0].trim()) {
            case "price" -> "price";
            case "name" -> "name";
            case "newest", "createdAt", "created_at" -> "created_at";
            case "sold", "soldCount", "sold_count" -> "sold_count";
            case "rating", "ratingAvg", "rating_avg" -> "rating_avg";
            default -> throw new BusinessException(ErrorCode.BAD_REQUEST,
                    "sort không hợp lệ: " + sort + " (price|name|newest|sold|rating, asc|desc)");
        };
        boolean desc = parts.length > 1 ? "desc".equalsIgnoreCase(parts[1].trim())
                : !field.equals("price") && !field.equals("name");
        return new Document(field, desc ? -1 : 1).append("sku", 1);
    }

    private static PageResponse<Product> page(PanacheQuery<Product> query, int page, int size) {
        int safeSize = Math.min(Math.max(size, 1), 100);
        int safePage = Math.max(page, 0);
        List<Product> content = query.page(Page.of(safePage, safeSize)).list();
        return PageResponse.of(content, safePage, safeSize, query.count());
    }

    private static Document anyOf(String singleField, String listField, String value) {
        // field mảng so sánh bằng với một phần tử là khớp nếu mảng chứa phần tử đó
        return new Document("$or", List.of(new Document(singleField, value), new Document(listField, value)));
    }

    private static void putFacet(Map<String, List<String>> facets, String name, MongoCollection<Product> col,
                                 Bson filter, String... fields) {
        TreeSet<String> values = new TreeSet<>();
        for (String field : fields) {
            col.distinct(field, filter, String.class).forEach(v -> {
                if (v != null) {
                    values.add(v);
                }
            });
        }
        if (!values.isEmpty()) {
            facets.put(name, List.copyOf(values));
        }
    }

    private static void putIfPresent(Document query, String field, String value) {
        if (notBlank(value)) {
            query.append(field, value);
        }
    }

    private static boolean notBlank(String s) {
        return s != null && !s.isBlank();
    }
}
