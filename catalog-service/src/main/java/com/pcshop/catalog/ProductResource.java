package com.pcshop.catalog;

import com.pcshop.contracts.BusinessException;
import com.pcshop.contracts.PageResponse;
import com.pcshop.contracts.ResponseData;
import jakarta.annotation.security.PermitAll;
import jakarta.inject.Inject;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;
import jakarta.ws.rs.DefaultValue;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;
import jakarta.ws.rs.QueryParam;

import java.math.BigDecimal;
import java.util.List;

/** Xem, lọc, tìm sản phẩm (công khai, chỉ ACTIVE) và API nội bộ lấy nhiều SKU. */
@Path("/api/v1/products")
@PermitAll
public class ProductResource {

    public record BatchRequest(@NotEmpty @Size(max = 100) List<String> skus) {
    }

    @Inject
    ProductService service;

    @Inject
    CatalogRepositories.ProductRepository products;

    /**
     * Lọc: category, brand, minPrice, maxPrice, thông số tương thích (socket, memoryType, formFactor → compat.*).
     * sort: price|name|newest|sold|rating kèm ",asc"/",desc" (mặc định price,asc).
     */
    @GET
    public ResponseData<PageResponse<Product>> products(@QueryParam("category") String category,
                                                       @QueryParam("brand") String brand,
                                                       @QueryParam("minPrice") BigDecimal minPrice,
                                                       @QueryParam("maxPrice") BigDecimal maxPrice,
                                                       @QueryParam("sort") String sort,
                                                       @QueryParam("socket") String socket,
                                                       @QueryParam("memoryType") String memoryType,
                                                       @QueryParam("formFactor") String formFactor,
                                                       @QueryParam("page") @DefaultValue("0") int page,
                                                       @QueryParam("size") @DefaultValue("20") int size) {
        var filter = new ProductService.ProductFilter(category, brand, minPrice, maxPrice, sort,
                socket, memoryType, formFactor);
        return ResponseData.success(service.searchActive(filter, page, size));
    }

    @GET
    @Path("/search")
    public ResponseData<PageResponse<Product>> search(@QueryParam("q") String q,
                                                     @QueryParam("page") @DefaultValue("0") int page,
                                                     @QueryParam("size") @DefaultValue("20") int size) {
        return ResponseData.success(service.fullTextSearch(q, page, size));
    }

    @GET
    @Path("/facets")
    public ResponseData<ProductService.Facets> facets(@QueryParam("category") String category) {
        return ResponseData.success(service.facets(category));
    }

    /** API nội bộ cho cart/ordering: tối đa 100 SKU, trả về sản phẩm đã công bố (kể cả HIDDEN/DISCONTINUED). */
    @POST
    @Path("/batch")
    public ResponseData<List<ProductService.ProductSummary>> batch(@Valid BatchRequest request) {
        return ResponseData.success(service.batch(request.skus()));
    }

    @GET
    @Path("/{sku}")
    public ResponseData<Product> bySku(@PathParam("sku") String sku) {
        return ResponseData.success(products.findActiveBySku(sku)
                .orElseThrow(() -> BusinessException.notFound("sản phẩm", sku)));
    }

    @GET
    @Path("/{sku}/price-history")
    public ResponseData<List<PriceHistory>> priceHistory(@PathParam("sku") String sku) {
        return ResponseData.success(service.priceHistory(sku));
    }
}
