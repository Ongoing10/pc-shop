package com.pcshop.inventory;

import com.pcshop.common.quarkus.CurrentUser;
import com.pcshop.contracts.BusinessException;
import com.pcshop.contracts.ErrorCode;
import com.pcshop.contracts.ResponseData;
import io.quarkus.security.Authenticated;
import jakarta.annotation.security.PermitAll;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.PUT;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;
import jakarta.ws.rs.QueryParam;

import java.util.List;

/**
 * KHUNG tồn kho.
 * TODO: consumer order.created → giữ hàng (stock_reservations) → outbox stock.reserved/stock.reserve-failed;
 *       job nhả hàng quá hạn; ghi stock_movements mỗi lần thay đổi.
 */
@Path("/api/v1/inventory")
public class InventoryResource {

    public record StockResponse(String sku, int available, boolean inStock) {
    }

    @Inject
    InventoryRepository inventories;

    @Inject
    CurrentUser currentUser;

    /** Công khai: còn hàng không (AI tool checkStock cũng gọi API này). */
    @GET
    @Path("/{sku}")
    @PermitAll
    public ResponseData<StockResponse> stock(@PathParam("sku") String sku) {
        List<Inventory> rows = inventories.findBySku(sku);
        if (rows.isEmpty()) {
            throw BusinessException.notFound("tồn kho của SKU", sku);
        }
        int available = rows.stream().mapToInt(Inventory::available).sum();
        return ResponseData.success(new StockResponse(sku, available, available > 0));
    }

    /** Điều chỉnh tồn kho: cần permission inventory:write (client role trong Keycloak). */
    @PUT
    @Path("/{sku}/adjust")
    @Authenticated
    @Transactional
    public ResponseData<StockResponse> adjust(@PathParam("sku") String sku,
                                              @QueryParam("warehouseId") Long warehouseId,
                                              @QueryParam("delta") int delta) {
        currentUser.requirePermission("inventory:write");
        Inventory row = inventories.find("sku = ?1 and warehouseId = ?2", sku, warehouseId).firstResultOptional()
                .orElseThrow(() -> BusinessException.notFound("tồn kho", sku + " @ kho " + warehouseId));
        if (row.quantity + delta < row.reservedQuantity) {
            throw new BusinessException(ErrorCode.BAD_REQUEST, "Không thể giảm dưới số lượng đang được giữ");
        }
        row.quantity += delta;
        return ResponseData.success(new StockResponse(sku, row.available(), row.available() > 0));
    }
}
