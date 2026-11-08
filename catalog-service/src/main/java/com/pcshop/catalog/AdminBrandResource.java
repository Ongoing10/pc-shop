package com.pcshop.catalog;

import com.pcshop.common.quarkus.CurrentUser;
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
 * Quản trị thương hiệu (permission product:write). Danh sách công khai: {@link BrandResource}.
 * Không có DELETE: collection dùng is_active, "xóa" = PATCH .../active.
 */
@Path("/api/v1/admin/brands")
@Authenticated
public class AdminBrandResource {

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
    CatalogRepositories.BrandRepository brands;

    @Inject
    CurrentUser currentUser;

    @GET
    public ResponseData<List<Brand>> list() {
        currentUser.requirePermission("product:write");
        return ResponseData.success(brands.listAllSorted());
    }

    @GET
    @Path("/{code}")
    public ResponseData<Brand> detail(@PathParam("code") String code) {
        currentUser.requirePermission("product:write");
        return ResponseData.success(find(code));
    }

    @POST
    public ResponseData<Brand> create(@Valid BrandRequest request) {
        currentUser.requirePermission("product:write");
        if (brands.findByCode(request.code()).isPresent()) {
            throw new BusinessException(ErrorCode.CONFLICT, "Mã thương hiệu đã tồn tại: " + request.code());
        }
        Brand b = new Brand();
        b.code = request.code();
        apply(b, request.name(), request.slug(), request.logoUrl());
        b.isActive = 1;
        b.createdAt = Instant.now();
        b.updatedAt = b.createdAt;
        brands.persist(b);
        return ResponseData.success(b);
    }

    @PUT
    @Path("/{code}")
    public ResponseData<Brand> update(@PathParam("code") String code, @Valid UpdateBrandRequest request) {
        currentUser.requirePermission("product:write");
        Brand b = find(code);
        apply(b, request.name(), request.slug(), request.logoUrl());
        b.updatedAt = Instant.now();
        brands.update(b);
        return ResponseData.success(b);
    }

    @PATCH
    @Path("/{code}/active")
    public ResponseData<Brand> setActive(@PathParam("code") String code, @Valid ActiveRequest request) {
        currentUser.requirePermission("product:write");
        Brand b = find(code);
        b.isActive = request.active() ? 1 : 0;
        b.updatedAt = Instant.now();
        brands.update(b);
        return ResponseData.success(b);
    }

    @PATCH
    @Path("/bulk/active")
    public ResponseData<List<Brand>> setActiveBulk(@Valid BulkActiveRequest request) {
        currentUser.requirePermission("product:write");
        BulkErrors errors = BulkErrors.check(request.codes());
        List<Brand> found = brands.findByCodes(request.codes());
        errors.missing(request.codes(), found.stream().map(b -> b.code).toList(), "Không tìm thấy").throwIfAny();
        Instant now = Instant.now();
        for (Brand b : found) {
            b.isActive = request.active() ? 1 : 0;
            b.updatedAt = now;
        }
        brands.update(found);
        return ResponseData.success(found);
    }

    // ------------------------------------------------------------------

    private void apply(Brand b, String name, String slug, String logoUrl) {
        String finalSlug = Slugs.orFrom(slug, name);
        if (brands.existsBySlugExcept(finalSlug, b.code)) {
            throw new BusinessException(ErrorCode.CONFLICT, "Slug đã được dùng: " + finalSlug);
        }
        b.name = name;
        b.slug = finalSlug;
        b.logoUrl = logoUrl;
    }

    private Brand find(String code) {
        return brands.findByCode(code).orElseThrow(() -> BusinessException.notFound("thương hiệu", code));
    }
}
