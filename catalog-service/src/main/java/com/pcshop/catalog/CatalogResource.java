package com.pcshop.catalog;

import com.pcshop.contracts.BusinessException;
import com.pcshop.contracts.ResponseData;
import jakarta.annotation.security.PermitAll;
import jakarta.inject.Inject;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;

import java.util.List;

/** Danh mục và thương hiệu (công khai, chỉ bản ghi đang hoạt động). Sản phẩm: ProductResource. */
@Path("/api/v1")
@PermitAll
public class CatalogResource {

    @Inject
    CatalogRepositories.CategoryRepository categories;

    @Inject
    CatalogRepositories.BrandRepository brands;

    @GET
    @Path("/categories")
    public ResponseData<List<Category>> categories() {
        return ResponseData.success(categories.listActive());
    }

    @GET
    @Path("/categories/{code}")
    public ResponseData<Category> category(@PathParam("code") String code) {
        return ResponseData.success(categories.findActiveByCode(code)
                .orElseThrow(() -> BusinessException.notFound("danh mục", code)));
    }

    @GET
    @Path("/brands")
    public ResponseData<List<Brand>> brands() {
        return ResponseData.success(brands.listActive());
    }

    @GET
    @Path("/brands/{code}")
    public ResponseData<Brand> brand(@PathParam("code") String code) {
        return ResponseData.success(brands.findActiveByCode(code)
                .orElseThrow(() -> BusinessException.notFound("thương hiệu", code)));
    }
}
