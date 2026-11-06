package com.pcshop.catalog;

import com.pcshop.contracts.PageResponse;
import com.pcshop.contracts.ResponseData;
import io.quarkus.security.Authenticated;
import io.smallrye.common.annotation.Blocking;
import jakarta.inject.Inject;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import jakarta.ws.rs.DefaultValue;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.PATCH;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.PUT;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;
import jakarta.ws.rs.QueryParam;
import jakarta.ws.rs.core.Response;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

/**
 * Quản trị sản phẩm (permission product:write, kiểm tra trong ProductService). Thấy cả DRAFT/HIDDEN.
 * Không có DELETE: sản phẩm dùng status (ngừng bán = DISCONTINUED).
 */
@Path("/api/v1/admin/products")
@Authenticated
public class AdminProductResource {

    public record CreateProductRequest(
            @NotBlank @Pattern(regexp = "^[A-Z0-9-]+$", message = "SKU chỉ gồm A-Z, 0-9, -") String sku,
            @NotBlank String name, String slug, @NotBlank String categoryCode, String brandCode,
            String shortDescription, String description,
            @NotNull @Positive BigDecimal price, @Positive BigDecimal originalPrice,
            List<Product.Image> images, Map<String, Object> specs, Map<String, Object> compat,
            List<String> tags, @Min(0) Integer warrantyMonths,
            @Min(1) @Max(2) Integer status) {
    }

    /** Sửa thông tin; giá và trạng thái đổi qua API riêng (để ghi lịch sử giá / bắn event). */
    public record UpdateProductRequest(
            @NotBlank String name, String slug, @NotBlank String categoryCode, String brandCode,
            String shortDescription, String description, @Positive BigDecimal originalPrice,
            List<Product.Image> images, Map<String, Object> specs, Map<String, Object> compat,
            List<String> tags, @Min(0) Integer warrantyMonths) {
    }

    public record StatusRequest(@NotNull @Min(1) @Max(4) Integer status) {
    }

    public record PriceRequest(@NotNull @Positive BigDecimal price, @Positive BigDecimal originalPrice,
                               String reason) {
    }

    /** Một dòng nhập catalog: SKU chưa có thì tạo (price bắt buộc, status 1/2), đã có thì sửa (bỏ qua status). */
    public record BulkProductItem(
            @NotBlank @Pattern(regexp = "^[A-Z0-9-]+$", message = "SKU chỉ gồm A-Z, 0-9, -") String sku,
            @NotBlank String name, String slug, @NotBlank String categoryCode, String brandCode,
            String shortDescription, String description,
            @Positive BigDecimal price, @Positive BigDecimal originalPrice,
            List<Product.Image> images, Map<String, Object> specs, Map<String, Object> compat,
            List<String> tags, @Min(0) Integer warrantyMonths,
            @Min(1) @Max(2) Integer status) {
    }

    public record BulkSaveRequest(@NotEmpty @Size(max = 100) List<@Valid BulkProductItem> items) {
    }

    public record BulkStatusRequest(@NotEmpty @Size(max = 100) List<String> skus,
                                    @NotNull @Min(1) @Max(4) Integer status) {
    }

    public record BulkPriceItem(@NotBlank String sku, @NotNull @Positive BigDecimal price,
                                @Positive BigDecimal originalPrice) {
    }

    public record BulkPriceRequest(@NotEmpty @Size(max = 100) List<@Valid BulkPriceItem> items, String reason) {
    }

    @Inject
    ProductService service;

    @Inject
    ProductExcelService excel;

    @GET
    public ResponseData<PageResponse<Product>> list(@QueryParam("status") Integer status,
                                                   @QueryParam("category") String category,
                                                   @QueryParam("q") String q,
                                                   @QueryParam("page") @DefaultValue("0") int page,
                                                   @QueryParam("size") @DefaultValue("20") int size) {
        return ResponseData.success(service.adminSearch(status, category, q, page, size));
    }

    /** EXP-2: file Excel cùng định dạng file mẫu import (sửa rồi import lại bằng UPSERT). */
    @GET
    @Path("/export")
    @Blocking
    public Response export(@QueryParam("category") String category, @QueryParam("status") Integer status) {
        return AdminProductImportResource.file(excel.export(category, status));
    }

    @GET
    @Path("/{sku}")
    public ResponseData<Product> detail(@PathParam("sku") String sku) {
        return ResponseData.success(service.adminGet(sku));
    }

    @POST
    public ResponseData<Product> create(@Valid CreateProductRequest r) {
        return ResponseData.success(service.create(new ProductService.ProductInput(r.sku(), r.name(), r.slug(),
                r.categoryCode(), r.brandCode(), r.shortDescription(), r.description(), r.price(),
                r.originalPrice(), r.images(), r.specs(), r.compat(), r.tags(), r.warrantyMonths(), r.status())));
    }

    @PUT
    @Path("/{sku}")
    public ResponseData<Product> update(@PathParam("sku") String sku, @Valid UpdateProductRequest r) {
        return ResponseData.success(service.update(sku, new ProductService.ProductInput(sku, r.name(), r.slug(),
                r.categoryCode(), r.brandCode(), r.shortDescription(), r.description(), null,
                r.originalPrice(), r.images(), r.specs(), r.compat(), r.tags(), r.warrantyMonths(), null)));
    }

    @PATCH
    @Path("/{sku}/status")
    public ResponseData<Product> changeStatus(@PathParam("sku") String sku, @Valid StatusRequest request) {
        return ResponseData.success(service.changeStatus(sku, request.status()));
    }

    /** Nhập catalog: tạo mới hoặc sửa nhiều sản phẩm, một dòng lỗi thì không lưu gì. */
    @POST
    @Path("/bulk")
    public ResponseData<ProductService.BulkSaveResult> saveAll(@Valid BulkSaveRequest request) {
        return ResponseData.success(service.saveAll(request.items().stream()
                .map(r -> new ProductService.ProductInput(r.sku(), r.name(), r.slug(), r.categoryCode(),
                        r.brandCode(), r.shortDescription(), r.description(), r.price(), r.originalPrice(),
                        r.images(), r.specs(), r.compat(), r.tags(), r.warrantyMonths(), r.status()))
                .toList()));
    }

    /** Đổi trạng thái hàng loạt (ẩn/ngừng bán thay cho xóa). */
    @PATCH
    @Path("/bulk/status")
    public ResponseData<List<Product>> changeStatusAll(@Valid BulkStatusRequest request) {
        return ResponseData.success(service.changeStatusAll(request.skus(), request.status()));
    }

    /** Đổi giá hàng loạt cùng một lý do, mỗi sản phẩm ghi thêm price_histories. */
    @PATCH
    @Path("/bulk/price")
    public ResponseData<List<Product>> changePriceAll(@Valid BulkPriceRequest request) {
        String reason = request.reason() == null || request.reason().isBlank() ? "BULK" : request.reason();
        return ResponseData.success(service.changePriceAll(request.items().stream()
                .map(i -> new ProductService.PriceInput(i.sku(), i.price(), i.originalPrice())).toList(), reason));
    }

    /** Đổi giá, ghi thêm một dòng price_histories. */
    @PATCH
    @Path("/{sku}/price")
    public ResponseData<Product> changePrice(@PathParam("sku") String sku, @Valid PriceRequest request) {
        String reason = request.reason() == null || request.reason().isBlank() ? "MANUAL" : request.reason();
        return ResponseData.success(service.changePrice(sku, request.price(), request.originalPrice(), reason));
    }
}
