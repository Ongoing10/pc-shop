package com.pcshop.customer;

import com.pcshop.common.quarkus.CurrentUser;
import com.pcshop.contracts.AuthUser;
import com.pcshop.contracts.ResponseData;
import io.quarkus.security.Authenticated;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Pattern;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.PUT;
import jakarta.ws.rs.Path;

import java.time.LocalDate;
import java.util.List;

@Path("/api/v1/me")
@Authenticated
public class MeResource {

    public record MeResponse(String id, String username, String email, List<String> roles,
                             List<String> permissions, CustomerProfile profile) {
    }

    public record UpdateProfileRequest(
            @Pattern(regexp = "^0\\d{9}$", message = "Số điện thoại không hợp lệ") String phoneNumber,
            Integer gender,
            LocalDate birthDate) {
    }

    @Inject
    CurrentUser currentUser;

    @Inject
    CustomerProfileRepository profiles;

    /** Thông tin tài khoản lấy từ token + hồ sơ trong DB (tự tạo ở lần gọi đầu tiên). */
    @GET
    @Transactional
    public ResponseData<MeResponse> me() {
        AuthUser user = currentUser.require();
        CustomerProfile profile = getOrCreate(user);
        return ResponseData.success(new MeResponse(user.id().toString(), user.username(), user.email(),
                user.roles(), user.permissions(), profile));
    }

    @PUT
    @Transactional
    public ResponseData<CustomerProfile> update(@Valid UpdateProfileRequest request) {
        CustomerProfile profile = getOrCreate(currentUser.require());
        profile.phoneNumber = request.phoneNumber();
        profile.gender = request.gender();
        profile.birthDate = request.birthDate();
        return ResponseData.success(profile);   // entity đang managed, commit cuối transaction
    }

    /**
     * Khách đăng ký trên trang của Keycloak nên DB chưa có hồ sơ: tạo khi họ gọi API lần đầu
     * (just-in-time provisioning) từ thông tin có sẵn trong token. Gọi song song cũng không lỗi trùng khóa.
     */
    private CustomerProfile getOrCreate(AuthUser user) {
        return profiles.findByIdOptional(user.id()).orElseGet(() ->
                profiles.findOrCreate(user.id(), user.email(), user.displayName() == null ? "" : user.displayName()));
    }
}
