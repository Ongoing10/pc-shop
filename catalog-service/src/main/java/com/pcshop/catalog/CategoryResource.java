package com.pcshop.catalog;

import com.pcshop.contracts.BusinessException;
import com.pcshop.contracts.ResponseData;
import jakarta.annotation.security.PermitAll;
import jakarta.inject.Inject;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;

import java.util.List;

/** Danh mục (công khai, chỉ bản ghi đang hoạt động). Quản trị: {@link AdminCategoryResource}. */
@Path("/api/v1/categories")
@PermitAll
public class CategoryResource {

    @Inject
    CatalogRepositories.CategoryRepository categories;

    @GET
    public ResponseData<List<Category>> categories() {
        return ResponseData.success(categories.listActive());
    }

    @GET
    @Path("/{code}")
    public ResponseData<Category> category(@PathParam("code") String code) {
        return ResponseData.success(categories.findActiveByCode(code)
                .orElseThrow(() -> BusinessException.notFound("danh mục", code)));
    }
}
