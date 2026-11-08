package com.pcshop.catalog;

import com.pcshop.common.quarkus.CurrentUser;
import com.pcshop.contracts.AuthUser;
import com.pcshop.contracts.BulkErrors;
import com.pcshop.contracts.BusinessException;
import com.pcshop.contracts.ErrorCode;
import com.pcshop.contracts.ResponseData;
import io.quarkus.security.Authenticated;
import jakarta.inject.Inject;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.PATCH;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.PUT;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;

import java.time.Instant;
import java.util.List;

/**
 * Quản trị danh mục (permission product:write). Danh sách công khai: {@link CategoryResource}.
 * Không có DELETE: collection dùng is_active, "xóa" = PATCH .../active.
 */
@Path("/api/v1/admin/categories")
@Authenticated
public class AdminCategoryResource {

    public record CategoryRequest(@NotBlank @Pattern(regexp = "^[A-Z0-9_]+$", message = "Mã chỉ gồm A-Z, 0-9, _")
                                  String code,
                                  @NotBlank String name, String slug, String pcSlot, Integer sortOrder) {
    }

    public record UpdateCategoryRequest(@NotBlank String name, String slug, String pcSlot, Integer sortOrder) {
    }

    public record ActiveRequest(@NotNull Boolean active) {
    }

    public record BulkActiveRequest(@NotEmpty List<String> codes, @NotNull Boolean active) {
    }

    @Inject
    CatalogRepositories.CategoryRepository categories;

    @Inject
    CurrentUser currentUser;

    /** Cả danh mục đang ẩn (để bật lại). */
    @GET
    public ResponseData<List<Category>> list() {
        currentUser.requirePermission("product:write");
        return ResponseData.success(categories.listAllSorted());
    }

    @GET
    @Path("/{code}")
    public ResponseData<Category> detail(@PathParam("code") String code) {
        currentUser.requirePermission("product:write");
        return ResponseData.success(find(code));
    }

    @POST
    public ResponseData<Category> create(@Valid CategoryRequest request) {
        AuthUser user = currentUser.requirePermission("product:write");
        if (categories.findByCode(request.code()).isPresent()) {
            throw new BusinessException(ErrorCode.CONFLICT, "Mã danh mục đã tồn tại: " + request.code());
        }
        Category c = new Category();
        c.code = request.code();
        apply(c, request.name(), request.slug(), request.pcSlot(), request.sortOrder());
        c.isActive = 1;
        c.createdBy = user.id().toString();
        c.createdAt = Instant.now();
        c.updatedBy = c.createdBy;
        c.updatedAt = c.createdAt;
        categories.persist(c);
        return ResponseData.success(c);
    }

    @PUT
    @Path("/{code}")
    public ResponseData<Category> update(@PathParam("code") String code, @Valid UpdateCategoryRequest request) {
        AuthUser user = currentUser.requirePermission("product:write");
        Category c = find(code);
        apply(c, request.name(), request.slug(), request.pcSlot(), request.sortOrder());
        c.updatedBy = user.id().toString();
        c.updatedAt = Instant.now();
        categories.update(c);
        return ResponseData.success(c);
    }

    @PATCH
    @Path("/{code}/active")
    public ResponseData<Category> setActive(@PathParam("code") String code, @Valid ActiveRequest request) {
        AuthUser user = currentUser.requirePermission("product:write");
        Category c = find(code);
        c.isActive = request.active() ? 1 : 0;
        c.updatedBy = user.id().toString();
        c.updatedAt = Instant.now();
        categories.update(c);
        return ResponseData.success(c);
    }

    /** Ẩn/hiện nhiều danh mục; mã nào không tồn tại thì không đổi gì. */
    @PATCH
    @Path("/bulk/active")
    public ResponseData<List<Category>> setActiveBulk(@Valid BulkActiveRequest request) {
        AuthUser user = currentUser.requirePermission("product:write");
        BulkErrors errors = BulkErrors.check(request.codes());
        List<Category> found = categories.findByCodes(request.codes());
        errors.missing(request.codes(), found.stream().map(c -> c.code).toList(), "Không tìm thấy").throwIfAny();
        Instant now = Instant.now();
        for (Category c : found) {
            c.isActive = request.active() ? 1 : 0;
            c.updatedBy = user.id().toString();
            c.updatedAt = now;
        }
        categories.update(found);
        return ResponseData.success(found);
    }

    // ------------------------------------------------------------------

    private void apply(Category c, String name, String slug, String pcSlot, Integer sortOrder) {
        String finalSlug = Slugs.orFrom(slug, name);
        if (categories.existsBySlugExcept(finalSlug, c.code)) {
            throw new BusinessException(ErrorCode.CONFLICT, "Slug đã được dùng: " + finalSlug);
        }
        c.name = name;
        c.slug = finalSlug;
        c.pcSlot = pcSlot;
        c.sortOrder = sortOrder;
    }

    private Category find(String code) {
        return categories.findByCode(code).orElseThrow(() -> BusinessException.notFound("danh mục", code));
    }
}
