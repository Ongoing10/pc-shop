package com.pcshop.inventory;

import com.pcshop.contracts.BusinessException;
import com.pcshop.contracts.ResponseData;
import io.quarkus.security.Authenticated;
import jakarta.annotation.security.PermitAll;
import jakarta.inject.Inject;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.PUT;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;
import jakarta.ws.rs.QueryParam;

import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Tồn kho (phía khách và API nội bộ).
 * TODO (đợt 2): consumer order.created → giữ hàng (stock_reservations) → outbox stock.reserved/stock.reserve-failed;
 *       job nhả hàng quá hạn.
 */
@Path("/api/v1/inventory")
public class InventoryResource {

    public record StockResponse(String sku, int available, boolean inStock) {
    }

    public record BatchRequest(@NotEmpty @Size(max = 100) List<String> skus) {
    }

    @Inject
    InventoryRepository inventories;

    @Inject
    InventoryService service;

    /** Công khai: còn hàng không (AI tool checkStock cũng gọi API này). */
    @GET
    @Path("/{sku}")
    @PermitAll
    public ResponseData<StockResponse> stock(@PathParam("sku") String sku) {
        List<Inventory> rows = inventories.findBySku(sku);
        if (rows.isEmpty()) {
            throw BusinessException.notFound("tồn kho của SKU", sku);
        }
        return ResponseData.success(toStock(sku, rows));
    }

    /**
     * Tồn kho của nhiều SKU một lần (API nội bộ cho cart/checkout, tránh N+1).
     * SKU chưa có dòng tồn kho nào vẫn trả về với available = 0.
     */
    @POST
    @Path("/batch")
    @PermitAll
    public ResponseData<List<StockResponse>> batch(@Valid BatchRequest request) {
        LinkedHashSet<String> skus = new LinkedHashSet<>(request.skus());
        Map<String, List<Inventory>> bySku = inventories.findBySkus(skus).stream()
                .collect(Collectors.groupingBy(i -> i.sku));
        return ResponseData.success(skus.stream()
                .map(sku -> toStock(sku, bySku.getOrDefault(sku, List.of())))
                .toList());
    }

    /** Điều chỉnh tồn kho: cần permission inventory:write; ghi stock_movements loại 4-Điều chỉnh. */
    @PUT
    @Path("/{sku}/adjust")
    @Authenticated
    public ResponseData<StockResponse> adjust(@PathParam("sku") String sku,
                                              @QueryParam("warehouseId") Long warehouseId,
                                              @QueryParam("delta") int delta,
                                              @QueryParam("note") String note) {
        service.adjust(sku, warehouseId, delta, note);
        return ResponseData.success(toStock(sku, inventories.findBySku(sku)));
    }

    private static StockResponse toStock(String sku, List<Inventory> rows) {
        int available = rows.stream().mapToInt(Inventory::available).sum();
        return new StockResponse(sku, available, available > 0);
    }
}
