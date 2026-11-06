package com.pcshop.inventory;

import com.pcshop.contracts.BulkErrors;
import com.pcshop.contracts.BusinessException;
import com.pcshop.contracts.ErrorCode;
import com.pcshop.contracts.ResponseData;
import jakarta.annotation.security.RolesAllowed;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.PATCH;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.PUT;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;

import java.util.List;

/**
 * Quản lý kho. Xem chi tiết: STAFF/ADMIN; thêm/sửa/bật tắt: ADMIN. Danh sách: {@link WarehouseResource}.
 * Không có DELETE: bảng có is_active nên "xóa" = PATCH .../active.
 */
@Path("/api/v1/admin/warehouses")
public class AdminWarehouseResource {

    public record WarehouseRequest(@NotBlank @Size(max = 20) String code, @NotBlank String name, String address) {
    }

    public record UpdateWarehouseRequest(@NotBlank String name, String address) {
    }

    public record ActiveRequest(@NotNull Boolean active) {
    }

    public record BulkActiveRequest(@NotEmpty List<Long> ids, @NotNull Boolean active) {
    }

    @Inject
    WarehouseRepository warehouses;

    @GET
    @Path("/{id}")
    @RolesAllowed({"STAFF", "ADMIN"})
    public ResponseData<Warehouse> detail(@PathParam("id") long id) {
        return ResponseData.success(find(id));
    }

    @POST
    @RolesAllowed("ADMIN")
    @Transactional
    public ResponseData<Warehouse> create(@Valid WarehouseRequest request) {
        if (warehouses.existsByCode(request.code())) {
            throw new BusinessException(ErrorCode.CONFLICT, "Mã kho đã tồn tại: " + request.code());
        }
        Warehouse w = new Warehouse();
        w.code = request.code();
        w.name = request.name();
        w.address = request.address();
        w.isActive = 1;
        warehouses.persist(w);
        return ResponseData.success(w);
    }

    @PUT
    @Path("/{id}")
    @RolesAllowed("ADMIN")
    @Transactional
    public ResponseData<Warehouse> update(@PathParam("id") long id, @Valid UpdateWarehouseRequest request) {
        Warehouse w = find(id);
        w.name = request.name();
        w.address = request.address();
        return ResponseData.success(w);
    }

    @PATCH
    @Path("/{id}/active")
    @RolesAllowed("ADMIN")
    @Transactional
    public ResponseData<Warehouse> setActive(@PathParam("id") long id, @Valid ActiveRequest request) {
        Warehouse w = find(id);
        w.isActive = request.active() ? 1 : 0;
        return ResponseData.success(w);
    }

    /** Ngừng/mở nhiều kho trong một transaction; id nào không tồn tại thì không đổi gì. */
    @PATCH
    @Path("/bulk/active")
    @RolesAllowed("ADMIN")
    @Transactional
    public ResponseData<List<Warehouse>> setActiveBulk(@Valid BulkActiveRequest request) {
        BulkErrors errors = BulkErrors.check(request.ids());
        List<Warehouse> found = warehouses.list("id in ?1", request.ids());
        request.ids().stream().filter(id -> found.stream().noneMatch(w -> w.id.equals(id)))
                .forEach(id -> errors.add(id, "Không tìm thấy kho"));
        errors.throwIfAny();
        found.forEach(w -> w.isActive = request.active() ? 1 : 0);
        return ResponseData.success(found);
    }

    private Warehouse find(long id) {
        return warehouses.findByIdOptional(id).orElseThrow(() -> BusinessException.notFound("kho", id));
    }
}
