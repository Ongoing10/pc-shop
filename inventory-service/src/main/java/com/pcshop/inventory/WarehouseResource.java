package com.pcshop.inventory;

import com.pcshop.contracts.ResponseData;
import jakarta.annotation.security.RolesAllowed;
import jakarta.inject.Inject;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.Path;

import java.util.List;

/**
 * Danh sách kho cho STAFF/ADMIN (cần để lọc tồn kho). Quản trị kho: {@link AdminWarehouseResource}.
 * Mỗi resource một @Path gốc riêng: Quarkus chọn lớp theo @Path khớp dài nhất rồi mới tìm method trong lớp đó.
 */
@Path("/api/v1/warehouses")
public class WarehouseResource {

    @Inject
    WarehouseRepository warehouses;

    @GET
    @RolesAllowed({"STAFF", "ADMIN"})
    public ResponseData<List<Warehouse>> list() {
        return ResponseData.success(warehouses.listAllByCode());
    }
}
