package com.pcshop.catalog;

import com.pcshop.common.quarkus.CurrentUser;
import com.pcshop.contracts.AuthUser;
import com.pcshop.contracts.BulkErrors;
import com.pcshop.contracts.BusinessException;
import com.pcshop.contracts.ErrorCode;
import com.pcshop.contracts.ResponseData;
import io.quarkus.security.Authenticated;
import jakarta.annotation.security.PermitAll;
import jakarta.inject.Inject;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;
import jakarta.ws.rs.DELETE;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.PUT;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;
import org.bson.Document;

import java.math.BigDecimal;
import java.security.SecureRandom;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * Cấu hình PC (PC Builder). Lưu kèm giá tại thời điểm lưu và kết quả của rule engine tương thích.
 * Xem: chủ cấu hình, STAFF/ADMIN, hoặc ai cũng xem được nếu is_public. Sửa/xóa: chỉ chủ cấu hình.
 * TODO: khách vãng lai lưu cấu hình (guest_key) khi làm giỏ hàng guest ở frontend.
 */
@Path("/api/v1/pc-builds")
public class PcBuildResource {

    private static final String CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    private static final SecureRandom RANDOM = new SecureRandom();

    public record ItemRequest(@NotBlank String sku, @Min(1) @Max(8) int quantity) {
    }

    public record BuildRequest(@Size(max = 255) String name, String purpose, @PositiveOrZero BigDecimal budget,
                               @NotEmpty @Size(max = 20) List<@Valid ItemRequest> items, Boolean isPublic) {
    }

    @Inject
    CatalogRepositories.PcBuildRepository builds;

    @Inject
    CatalogRepositories.ProductRepository products;

    @Inject
    CatalogRepositories.CategoryRepository categories;

    @Inject
    CompatibilityService compatibility;

    @Inject
    CurrentUser currentUser;

    @GET
    @Path("/my")
    @Authenticated
    public ResponseData<List<PcBuild>> mine() {
        return ResponseData.success(builds.listByUser(currentUser.require().id().toString()));
    }

    @GET
    @Path("/{code}")
    @PermitAll
    public ResponseData<PcBuild> byCode(@PathParam("code") String code) {
        PcBuild build = find(code);
        boolean allowed = Boolean.TRUE.equals(build.isPublic) || currentUser.get()
                .map(u -> u.id().toString().equals(build.userId) || u.isStaff())
                .orElse(false);
        if (!allowed) {
            throw BusinessException.forbidden("Cấu hình này không được chia sẻ công khai");
        }
        return ResponseData.success(build);
    }

    @POST
    @Authenticated
    public ResponseData<PcBuild> create(@Valid BuildRequest request) {
        AuthUser user = currentUser.require();
        PcBuild build = new PcBuild();
        build.code = newCode();
        build.userId = user.id().toString();
        build.isAiGenerated = false;
        build.createdAt = Instant.now();
        apply(build, request);
        builds.persist(build);
        return ResponseData.success(build);
    }

    @PUT
    @Path("/{code}")
    @Authenticated
    public ResponseData<PcBuild> update(@PathParam("code") String code, @Valid BuildRequest request) {
        PcBuild build = findOwned(code);
        apply(build, request);
        builds.update(build);
        return ResponseData.success(build);
    }

    /** Xóa thật (đơn hàng đặt từ cấu hình đã có snapshot linh kiện). */
    @DELETE
    @Path("/{code}")
    @Authenticated
    public ResponseData<Void> delete(@PathParam("code") String code) {
        builds.delete(findOwned(code));
        return ResponseData.success(null);
    }

    public record BulkDeleteRequest(@NotEmpty @Size(max = 100) List<String> codes) {
    }

    /** Xóa thật nhiều cấu hình của chính mình; một mã không tồn tại hoặc của người khác thì không xóa gì. */
    @POST
    @Path("/bulk-delete")
    @Authenticated
    public ResponseData<Map<String, Long>> deleteAll(@Valid BulkDeleteRequest request) {
        String userId = currentUser.require().id().toString();
        BulkErrors errors = BulkErrors.check(request.codes());
        List<PcBuild> found = builds.findByCodes(request.codes());
        AdminCatalogResource.missing(request.codes(), found.stream().map(b -> b.code).toList(), errors);
        found.stream().filter(b -> !userId.equals(b.userId))
                .forEach(b -> errors.add(b.code, "Đây không phải cấu hình của bạn"));
        errors.throwIfAny();
        long deleted = builds.delete(new Document("code", new Document("$in", request.codes())).append("user_id", userId));
        return ResponseData.success(Map.of("deleted", deleted));
    }

    // ------------------------------------------------------------------

    /** Chụp giá hiện tại và chạy rule engine (SKU lặp theo số lượng để tính đúng tổng công suất). */
    private void apply(PcBuild build, BuildRequest request) {
        Map<String, Product> bySku = products.findBySkus(request.items().stream().map(ItemRequest::sku).toList())
                .stream()
                .filter(p -> p.status != null && p.status == Product.ACTIVE)
                .collect(Collectors.toMap(p -> p.sku, Function.identity()));
        Map<String, String> slotByCategory = categories.listAllSorted().stream()
                .filter(c -> c.pcSlot != null)
                .collect(Collectors.toMap(c -> c.code, c -> c.pcSlot));

        List<PcBuild.Item> items = new ArrayList<>();
        List<String> expandedSkus = new ArrayList<>();
        BigDecimal total = BigDecimal.ZERO;
        for (ItemRequest line : request.items()) {
            Product p = bySku.get(line.sku());
            if (p == null) {
                throw new BusinessException(ErrorCode.BAD_REQUEST, "Sản phẩm không tồn tại hoặc ngừng bán: " + line.sku());
            }
            PcBuild.Item item = new PcBuild.Item();
            item.slot = slotByCategory.getOrDefault(p.categoryCode, p.categoryCode);
            item.productId = p.id.toHexString();
            item.sku = p.sku;
            item.name = p.name;
            item.quantity = line.quantity();
            item.priceAtTime = p.price;
            items.add(item);
            total = total.add(p.price.multiply(BigDecimal.valueOf(line.quantity())));
            for (int i = 0; i < line.quantity(); i++) {
                expandedSkus.add(p.sku);
            }
        }

        CompatibilityService.CheckResult check = compatibility.check(expandedSkus);
        PcBuild.CompatibilityResult result = new PcBuild.CompatibilityResult();
        result.isCompatible = check.compatible();
        result.checkedAt = Instant.now();
        result.issues = check.issues().stream().map(i -> {
            PcBuild.Issue issue = new PcBuild.Issue();
            issue.ruleCode = i.ruleCode();
            issue.severity = i.severity();
            issue.message = i.message();
            return issue;
        }).toList();

        build.name = request.name();
        build.purpose = request.purpose();
        build.budget = request.budget();
        build.isPublic = Boolean.TRUE.equals(request.isPublic());
        build.items = items;
        build.totalPrice = total;
        build.estimatedWattage = check.estimatedWattage();
        build.compatibilityResult = result;
        build.updatedAt = Instant.now();
    }

    private PcBuild find(String code) {
        return builds.findByCode(code).orElseThrow(() -> BusinessException.notFound("cấu hình", code));
    }

    private PcBuild findOwned(String code) {
        PcBuild build = find(code);
        if (!currentUser.require().id().toString().equals(build.userId)) {
            throw BusinessException.forbidden("Đây không phải cấu hình của bạn");
        }
        return build;
    }

    private String newCode() {
        for (int attempt = 0; attempt < 5; attempt++) {
            StringBuilder sb = new StringBuilder("PC");
            for (int i = 0; i < 8; i++) {
                sb.append(CODE_CHARS.charAt(RANDOM.nextInt(CODE_CHARS.length())));
            }
            if (builds.findByCode(sb.toString()).isEmpty()) {
                return sb.toString();
            }
        }
        throw new BusinessException(ErrorCode.INTERNAL_ERROR, "Không sinh được mã cấu hình, thử lại");
    }
}
