package com.pcshop.catalog;

import com.pcshop.contracts.BusinessException;
import com.pcshop.contracts.PageResponse;
import com.pcshop.contracts.ResponseData;
import jakarta.annotation.security.PermitAll;
import jakarta.inject.Inject;
import jakarta.ws.rs.DefaultValue;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;
import jakarta.ws.rs.QueryParam;

import java.util.List;

/**
 * KHUNG catalog: xem danh mục và sản phẩm (công khai).
 * TODO: CRUD admin (yêu cầu permission product:write), lọc theo specs/compat, ghi price_histories khi đổi giá,
 *       bắn event product.updated / product.hidden cho ai-service, rule engine tương thích, PC Builder.
 */
@Path("/api/v1")
@PermitAll
public class CatalogResource {

    @Inject
    CatalogRepositories.CategoryRepository categories;

    @Inject
    CatalogRepositories.ProductRepository products;

    @GET
    @Path("/categories")
    public ResponseData<List<Category>> categories() {
        return ResponseData.success(categories.listActive());
    }

    @GET
    @Path("/products")
    public ResponseData<PageResponse<Product>> products(@QueryParam("category") String category,
                                                       @QueryParam("page") @DefaultValue("0") int page,
                                                       @QueryParam("size") @DefaultValue("20") int size) {
        int safeSize = Math.min(Math.max(size, 1), 100);
        List<Product> content = products.pageActive(category, page, safeSize);
        return ResponseData.success(PageResponse.of(content, page, safeSize, products.countActive(category)));
    }

    @GET
    @Path("/products/{sku}")
    public ResponseData<Product> bySku(@PathParam("sku") String sku) {
        return ResponseData.success(products.findActiveBySku(sku)
                .orElseThrow(() -> BusinessException.notFound("sản phẩm", sku)));
    }
}
