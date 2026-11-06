package com.pcshop.customer;

import com.pcshop.contracts.BusinessException;
import com.pcshop.contracts.ResponseData;
import jakarta.annotation.security.PermitAll;
import jakarta.inject.Inject;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;

import java.util.List;

/** Danh mục hành chính 2 cấp cho form địa chỉ (công khai). */
@Path("/api/v1/locations")
@PermitAll
public class LocationResource {

    @Inject
    LocationCatalog locations;

    @GET
    @Path("/provinces")
    public ResponseData<List<LocationCatalog.ProvinceItem>> provinces() {
        return ResponseData.success(locations.provinces());
    }

    @GET
    @Path("/provinces/{code}/wards")
    public ResponseData<List<LocationCatalog.Ward>> wards(@PathParam("code") String code) {
        return ResponseData.success(locations.province(code)
                .orElseThrow(() -> BusinessException.notFound("tỉnh/thành", code))
                .wards());
    }
}
