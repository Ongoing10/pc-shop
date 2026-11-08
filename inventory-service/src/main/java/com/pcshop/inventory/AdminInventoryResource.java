package com.pcshop.inventory;

import com.pcshop.contracts.PageResponse;
import com.pcshop.contracts.ResponseData;
import io.quarkus.hibernate.orm.panache.PanacheQuery;
import io.quarkus.panache.common.Page;
import io.quarkus.security.Authenticated;
import io.smallrye.common.annotation.Blocking;
import jakarta.annotation.security.RolesAllowed;
import jakarta.inject.Inject;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import jakarta.ws.rs.DefaultValue;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.QueryParam;
import jakarta.ws.rs.core.Response;

import java.time.LocalDate;
import java.util.List;

/**
 * Màn hình quản lý kho của trang admin: xem tồn, nhập kho, lịch sử biến động.
 * Nhập kho từ Excel: {@link AdminStockImportResource}; thống kê sắp hết hàng: {@link AdminInventoryStatsResource}.
 */
@Path("/api/v1/admin/inventory")
public class AdminInventoryResource {

    public record ImportLineRequest(@NotBlank String sku, String productId, @Min(1) int quantity) {
    }

    public record ImportRequest(@NotNull Long warehouseId, String referenceCode, String note,
                                @NotEmpty @Size(max = 200) List<@Valid ImportLineRequest> lines) {
    }

    @Inject
    InventoryRepository inventories;

    @Inject
    StockMovementRepository movements;

    @Inject
    InventoryService service;

    @Inject
    StockExcelService excel;

    @GET
    @RolesAllowed({"STAFF", "ADMIN"})
    public ResponseData<PageResponse<Inventory>> list(@QueryParam("warehouseId") Long warehouseId,
                                                      @QueryParam("lowStock") @DefaultValue("false") boolean lowStock,
                                                      @QueryParam("page") @DefaultValue("0") int page,
                                                      @QueryParam("size") @DefaultValue("20") int size) {
        return ResponseData.success(page(inventories.search(warehouseId, lowStock), page, size));
    }

    /** EXP-3: file Excel tồn kho, cùng bộ lọc với danh sách. */
    @GET
    @Path("/export")
    @RolesAllowed({"STAFF", "ADMIN"})
    @Blocking
    public Response export(@QueryParam("warehouseId") Long warehouseId,
                           @QueryParam("lowStock") @DefaultValue("false") boolean lowStock) {
        return AdminStockImportResource.file(excel.export(warehouseId, lowStock));
    }

    /** Nhập kho nhiều dòng (permission inventory:write, kiểm tra trong service). */
    @POST
    @Path("/import")
    @Authenticated
    public ResponseData<List<Inventory>> importStock(@Valid ImportRequest request) {
        List<InventoryService.ImportLine> lines = request.lines().stream()
                .map(l -> new InventoryService.ImportLine(l.sku(), l.productId(), l.quantity()))
                .toList();
        return ResponseData.success(service.importStock(request.warehouseId(), request.referenceCode(),
                request.note(), lines));
    }

    @GET
    @Path("/movements")
    @RolesAllowed({"STAFF", "ADMIN"})
    public ResponseData<PageResponse<StockMovement>> movements(@QueryParam("sku") String sku,
                                                               @QueryParam("from") LocalDate from,
                                                               @QueryParam("to") LocalDate to,
                                                               @QueryParam("page") @DefaultValue("0") int page,
                                                               @QueryParam("size") @DefaultValue("50") int size) {
        return ResponseData.success(page(movements.search(sku, from, to), page, size));
    }

    private static <T> PageResponse<T> page(PanacheQuery<T> query, int page, int size) {
        int safeSize = Math.min(Math.max(size, 1), 100);
        int safePage = Math.max(page, 0);
        List<T> content = query.page(Page.of(safePage, safeSize)).list();
        return PageResponse.of(content, safePage, safeSize, query.count());
    }
}
