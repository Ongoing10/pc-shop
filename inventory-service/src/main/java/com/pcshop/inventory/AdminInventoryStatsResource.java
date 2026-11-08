package com.pcshop.inventory;

import com.pcshop.contracts.ResponseData;
import jakarta.annotation.security.RolesAllowed;
import jakarta.inject.Inject;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.Path;

import java.util.List;

/**
 * Thống kê kho cho dashboard admin. Gateway chỉ chuyển /admin/stats/low-stock sang đây,
 * các /admin/stats/* khác thuộc ordering-service.
 */
@Path("/api/v1/admin/stats")
public class AdminInventoryStatsResource {

    @Inject
    InventoryRepository inventories;

    /** Các dòng tồn kho có số có thể bán không vượt mức tối thiểu. */
    @GET
    @Path("/low-stock")
    @RolesAllowed({"STAFF", "ADMIN"})
    public ResponseData<List<Inventory>> lowStock() {
        return ResponseData.success(inventories.lowStock());
    }
}
