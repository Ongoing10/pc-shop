package com.pcshop.customer;

import com.pcshop.common.quarkus.CurrentUser;
import com.pcshop.contracts.BusinessException;
import com.pcshop.contracts.ErrorCode;
import com.pcshop.contracts.ResponseData;
import io.quarkus.security.Authenticated;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import jakarta.ws.rs.DELETE;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.PATCH;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.PUT;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;

import java.util.List;
import java.util.UUID;

/**
 * Sổ địa chỉ của chính người đang đăng nhập (không có API xem địa chỉ của người khác).
 * Địa chỉ đầu tiên tự thành mặc định; mỗi user tối đa 1 địa chỉ mặc định (có thêm unique index một phần trong DB).
 */
@Path("/api/v1/addresses")
@Authenticated
public class AddressResource {

    private static final int MAX_ADDRESSES = 10;

    public record AddressRequest(
            @NotBlank @Size(max = 255) String receiverName,
            @NotBlank @Pattern(regexp = "^0\\d{9}$", message = "Số điện thoại không hợp lệ") String receiverPhone,
            @NotBlank String provinceCode,
            @NotBlank String wardCode,
            @NotBlank @Size(max = 255) String addressDetail,
            Boolean isDefault) {
    }

    @Inject
    UserAddressRepository addresses;

    @Inject
    LocationCatalog locations;

    @Inject
    CurrentUser currentUser;

    @GET
    public ResponseData<List<UserAddress>> list() {
        return ResponseData.success(addresses.listByUser(userId()));
    }

    @GET
    @Path("/{id}")
    public ResponseData<UserAddress> detail(@PathParam("id") long id) {
        return ResponseData.success(owned(id));
    }

    @POST
    @Transactional
    public ResponseData<UserAddress> create(@Valid AddressRequest request) {
        UUID userId = userId();
        long existing = addresses.countByUser(userId);
        if (existing >= MAX_ADDRESSES) {
            throw new BusinessException(ErrorCode.BAD_REQUEST, "Tối đa " + MAX_ADDRESSES + " địa chỉ");
        }
        UserAddress a = new UserAddress();
        a.userId = userId;
        apply(a, request);
        a.isDefault = existing == 0 || Boolean.TRUE.equals(request.isDefault());
        if (a.isDefault) {
            addresses.clearDefault(userId, null);
        }
        addresses.persist(a);
        return ResponseData.success(a);
    }

    @PUT
    @Path("/{id}")
    @Transactional
    public ResponseData<UserAddress> update(@PathParam("id") long id, @Valid AddressRequest request) {
        UserAddress a = owned(id);
        apply(a, request);
        if (Boolean.TRUE.equals(request.isDefault()) && !a.isDefault) {
            addresses.clearDefault(a.userId, a.id);
            a.isDefault = true;
        }
        return ResponseData.success(a);
    }

    /** Xóa thật. Xóa địa chỉ mặc định thì địa chỉ mới nhất còn lại thành mặc định. */
    @DELETE
    @Path("/{id}")
    @Transactional
    public ResponseData<Void> delete(@PathParam("id") long id) {
        UserAddress a = owned(id);
        boolean wasDefault = a.isDefault;
        addresses.delete(a);
        addresses.flush();
        if (wasDefault) {
            addresses.listByUser(a.userId).stream().findFirst().ifPresent(next -> next.isDefault = true);
        }
        return ResponseData.success(null);
    }

    @PATCH
    @Path("/{id}/default")
    @Transactional
    public ResponseData<UserAddress> makeDefault(@PathParam("id") long id) {
        UserAddress a = owned(id);
        addresses.clearDefault(a.userId, a.id);
        a.isDefault = true;
        return ResponseData.success(a);
    }

    // ------------------------------------------------------------------

    /** Tên tỉnh/phường lấy từ danh mục (không tin tên client gửi lên). */
    private void apply(UserAddress a, AddressRequest r) {
        LocationCatalog.Province province = locations.province(r.provinceCode())
                .orElseThrow(() -> new BusinessException(ErrorCode.BAD_REQUEST, "Mã tỉnh/thành không hợp lệ: " + r.provinceCode()));
        LocationCatalog.Ward ward = locations.ward(r.provinceCode(), r.wardCode())
                .orElseThrow(() -> new BusinessException(ErrorCode.BAD_REQUEST,
                        "Mã phường/xã không thuộc " + province.name() + ": " + r.wardCode()));
        a.receiverName = r.receiverName();
        a.receiverPhone = r.receiverPhone();
        a.provinceCode = province.code();
        a.provinceName = province.name();
        a.wardCode = ward.code();
        a.wardName = ward.name();
        a.addressDetail = r.addressDetail();
    }

    private UserAddress owned(long id) {
        return addresses.findOwned(id, userId()).orElseThrow(() -> BusinessException.notFound("địa chỉ", id));
    }

    private UUID userId() {
        return currentUser.require().id();
    }
}
