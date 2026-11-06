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
 * Quản trị danh mục và thương hiệu (permission product:write).
 * Không có DELETE: hai collection dùng is_active, "xóa" = PATCH .../active.
 */
@Path("/api/v1/admin")
@Authenticated
public class AdminCatalogResource {

    public record CategoryRequest(@NotBlank @Pattern(regexp = "^[A-Z0-9_]+$", message = "Mã chỉ gồm A-Z, 0-9, _")
                                  String code,
                                  @NotBlank String name, String slug, String pcSlot, Integer sortOrder) {
    }

    public record UpdateCategoryRequest(@NotBlank String name, String slug, String pcSlot, Integer sortOrder) {
    }

    public record BrandRequest(@NotBlank @Pattern(regexp = "^[A-Z0-9_]+$", message = "Mã chỉ gồm A-Z, 0-9, _")
                               String code,
                               @NotBlank String name, String slug, String logoUrl) {
    }

    public record UpdateBrandRequest(@NotBlank String name, String slug, String logoUrl) {
    }

    public record ActiveRequest(@NotNull Boolean active) {
    }

    public record BulkActiveRequest(@NotEmpty List<String> codes, @NotNull Boolean active) {
    }

    @Inject
    CatalogRepositories.CategoryRepository categories;

    @Inject
    CatalogRepositories.BrandRepository brands;

    @Inject
    CurrentUser currentUser;

    // ------------------------------------------------------------------ danh mục

    /** Cả danh mục đang ẩn (để bật lại). */
    @GET
    @Path("/categories")
    public ResponseData<List<Category>> listCategories() {
        currentUser.requirePermission("product:write");
        return ResponseData.success(categories.listAllSorted());
    }

    @GET
    @Path("/categories/{code}")
    public ResponseData<Category> categoryDetail(@PathParam("code") String code) {
        currentUser.requirePermission("product:write");
        return ResponseData.success(category(code));
    }

    @POST
    @Path("/categories")
    public ResponseData<Category> createCategory(@Valid CategoryRequest request) {
        AuthUser user = currentUser.requirePermission("product:write");
        if (categories.findByCode(request.code()).isPresent()) {
            throw new BusinessException(ErrorCode.CONFLICT, "Mã danh mục đã tồn tại: " + request.code());
        }
        Category c = new Category();
        c.code = request.code();
        applyCategory(c, request.name(), request.slug(), request.pcSlot(), request.sortOrder());
        c.isActive = 1;
        c.createdBy = user.id().toString();
        c.createdAt = Instant.now();
        c.updatedBy = c.createdBy;
        c.updatedAt = c.createdAt;
        categories.persist(c);
        return ResponseData.success(c);
    }

    @PUT
    @Path("/categories/{code}")
    public ResponseData<Category> updateCategory(@PathParam("code") String code,
                                                 @Valid UpdateCategoryRequest request) {
        AuthUser user = currentUser.requirePermission("product:write");
        Category c = category(code);
        applyCategory(c, request.name(), request.slug(), request.pcSlot(), request.sortOrder());
        c.updatedBy = user.id().toString();
        c.updatedAt = Instant.now();
        categories.update(c);
        return ResponseData.success(c);
    }

    @PATCH
    @Path("/categories/{code}/active")
    public ResponseData<Category> setCategoryActive(@PathParam("code") String code, @Valid ActiveRequest request) {
        AuthUser user = currentUser.requirePermission("product:write");
        Category c = category(code);
        c.isActive = request.active() ? 1 : 0;
        c.updatedBy = user.id().toString();
        c.updatedAt = Instant.now();
        categories.update(c);
        return ResponseData.success(c);
    }

    /** Ẩn/hiện nhiều danh mục; mã nào không tồn tại thì không đổi gì. */
    @PATCH
    @Path("/categories/bulk/active")
    public ResponseData<List<Category>> setCategoriesActive(@Valid BulkActiveRequest request) {
        AuthUser user = currentUser.requirePermission("product:write");
        BulkErrors errors = BulkErrors.check(request.codes());
        List<Category> found = categories.findByCodes(request.codes());
        missing(request.codes(), found.stream().map(c -> c.code).toList(), errors);
        errors.throwIfAny();
        Instant now = Instant.now();
        for (Category c : found) {
            c.isActive = request.active() ? 1 : 0;
            c.updatedBy = user.id().toString();
            c.updatedAt = now;
        }
        categories.update(found);
        return ResponseData.success(found);
    }

    // ------------------------------------------------------------------ thương hiệu

    @GET
    @Path("/brands")
    public ResponseData<List<Brand>> listBrands() {
        currentUser.requirePermission("product:write");
        return ResponseData.success(brands.listAllSorted());
    }

    @GET
    @Path("/brands/{code}")
    public ResponseData<Brand> brandDetail(@PathParam("code") String code) {
        currentUser.requirePermission("product:write");
        return ResponseData.success(brand(code));
    }

    @POST
    @Path("/brands")
    public ResponseData<Brand> createBrand(@Valid BrandRequest request) {
        currentUser.requirePermission("product:write");
        if (brands.findByCode(request.code()).isPresent()) {
            throw new BusinessException(ErrorCode.CONFLICT, "Mã thương hiệu đã tồn tại: " + request.code());
        }
        Brand b = new Brand();
        b.code = request.code();
        applyBrand(b, request.name(), request.slug(), request.logoUrl());
        b.isActive = 1;
        b.createdAt = Instant.now();
        b.updatedAt = b.createdAt;
        brands.persist(b);
        return ResponseData.success(b);
    }

    @PUT
    @Path("/brands/{code}")
    public ResponseData<Brand> updateBrand(@PathParam("code") String code, @Valid UpdateBrandRequest request) {
        currentUser.requirePermission("product:write");
        Brand b = brand(code);
        applyBrand(b, request.name(), request.slug(), request.logoUrl());
        b.updatedAt = Instant.now();
        brands.update(b);
        return ResponseData.success(b);
    }

    @PATCH
    @Path("/brands/{code}/active")
    public ResponseData<Brand> setBrandActive(@PathParam("code") String code, @Valid ActiveRequest request) {
        currentUser.requirePermission("product:write");
        Brand b = brand(code);
        b.isActive = request.active() ? 1 : 0;
        b.updatedAt = Instant.now();
        brands.update(b);
        return ResponseData.success(b);
    }

    @PATCH
    @Path("/brands/bulk/active")
    public ResponseData<List<Brand>> setBrandsActive(@Valid BulkActiveRequest request) {
        currentUser.requirePermission("product:write");
        BulkErrors errors = BulkErrors.check(request.codes());
        List<Brand> found = brands.findByCodes(request.codes());
        missing(request.codes(), found.stream().map(b -> b.code).toList(), errors);
        errors.throwIfAny();
        Instant now = Instant.now();
        for (Brand b : found) {
            b.isActive = request.active() ? 1 : 0;
            b.updatedAt = now;
        }
        brands.update(found);
        return ResponseData.success(found);
    }

    // ------------------------------------------------------------------

    static void missing(List<String> requested, List<String> found, BulkErrors errors) {
        requested.stream().filter(code -> !found.contains(code)).forEach(code -> errors.add(code, "Không tìm thấy"));
    }

    private void applyCategory(Category c, String name, String slug, String pcSlot, Integer sortOrder) {
        String finalSlug = Slugs.orFrom(slug, name);
        if (categories.existsBySlugExcept(finalSlug, c.code)) {
            throw new BusinessException(ErrorCode.CONFLICT, "Slug đã được dùng: " + finalSlug);
        }
        c.name = name;
        c.slug = finalSlug;
        c.pcSlot = pcSlot;
        c.sortOrder = sortOrder;
    }

    private void applyBrand(Brand b, String name, String slug, String logoUrl) {
        String finalSlug = Slugs.orFrom(slug, name);
        if (brands.existsBySlugExcept(finalSlug, b.code)) {
            throw new BusinessException(ErrorCode.CONFLICT, "Slug đã được dùng: " + finalSlug);
        }
        b.name = name;
        b.slug = finalSlug;
        b.logoUrl = logoUrl;
    }

    private Category category(String code) {
        return categories.findByCode(code).orElseThrow(() -> BusinessException.notFound("danh mục", code));
    }

    private Brand brand(String code) {
        return brands.findByCode(code).orElseThrow(() -> BusinessException.notFound("thương hiệu", code));
    }
}
