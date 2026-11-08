package com.pcshop.catalog;

import com.pcshop.contracts.BusinessException;
import com.pcshop.contracts.ResponseData;
import jakarta.annotation.security.PermitAll;
import jakarta.inject.Inject;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;

import java.util.List;

/** Thương hiệu (công khai, chỉ bản ghi đang hoạt động). Quản trị: {@link AdminBrandResource}. */
@Path("/api/v1/brands")
@PermitAll
public class BrandResource {

    @Inject
    CatalogRepositories.BrandRepository brands;

    @GET
    public ResponseData<List<Brand>> brands() {
        return ResponseData.success(brands.listActive());
    }

    @GET
    @Path("/{code}")
    public ResponseData<Brand> brand(@PathParam("code") String code) {
        return ResponseData.success(brands.findActiveByCode(code)
                .orElseThrow(() -> BusinessException.notFound("thương hiệu", code)));
    }
}
