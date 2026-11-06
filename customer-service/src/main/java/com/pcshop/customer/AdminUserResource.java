package com.pcshop.customer;

import com.pcshop.common.quarkus.CurrentUser;
import com.pcshop.contracts.AuthUser;
import com.pcshop.contracts.BusinessException;
import com.pcshop.contracts.ErrorCode;
import com.pcshop.contracts.PageResponse;
import com.pcshop.contracts.ResponseData;
import com.pcshop.customer.keycloak.KeycloakAdminApi;
import com.pcshop.customer.keycloak.KeycloakAdminApi.KeycloakUser;
import jakarta.annotation.security.RolesAllowed;
import jakarta.inject.Inject;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import jakarta.ws.rs.DefaultValue;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.PUT;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;
import jakarta.ws.rs.QueryParam;
import org.eclipse.microprofile.rest.client.inject.RestClient;

import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Màn hình "Quản lý người dùng" của trang admin shop:
 * tài khoản lấy từ Keycloak Admin API, ghép thêm hồ sơ trong DB của mình.
 */
@Path("/api/v1/admin/users")
@RolesAllowed("ADMIN")
public class AdminUserResource {

    public record UserRow(String id, String username, String email, String fullName, boolean active,
                          String phoneNumber) {
    }

    @Inject
    @RestClient
    KeycloakAdminApi keycloak;

    public record CreateStaffRequest(
            @NotBlank @Pattern(regexp = "^[a-z0-9._-]{3,50}$", message = "Username 3-50 ký tự a-z, 0-9, . _ -") String username,
            @NotBlank @Email String email,
            @NotBlank String firstName,
            String lastName,
            @NotBlank @Size(min = 6, max = 100) String password,
            Boolean temporaryPassword,
            List<String> realmRoles,
            List<String> permissions) {
    }

    public record RolesRequest(@NotNull List<String> realmRoles, List<String> permissions) {
    }

    @Inject
    CustomerProfileRepository profiles;

    @Inject
    UserAccountService accounts;

    @Inject
    CurrentUser currentUser;

    @GET
    public ResponseData<PageResponse<UserRow>> list(@QueryParam("keyword") String keyword,
                                                    @QueryParam("page") @DefaultValue("0") int page,
                                                    @QueryParam("size") @DefaultValue("20") int size) {
        List<UserRow> rows = keycloak.search(keyword, page * size, size, true).stream().map(this::toRow).toList();
        int total = keycloak.count(keyword);
        return ResponseData.success(PageResponse.of(rows, page, size, total));
    }

    public record UserDetailResponse(String id, String username, String email, String firstName, String lastName,
                                     boolean active, Boolean emailVerified, Long createdTimestamp,
                                     CustomerProfile profile, List<String> realmRoles, List<String> permissions) {
    }

    /** Chi tiết tài khoản + hồ sơ + role hiện tại (null profile nếu user chưa gọi API nào của shop). */
    @GET
    @Path("/{id}")
    public ResponseData<UserDetailResponse> detail(@PathParam("id") String id) {
        UserAccountService.UserDetail d = accounts.detail(id);
        KeycloakUser u = d.account();
        CustomerProfile profile = profiles.findByIdOptional(UUID.fromString(u.id())).orElse(null);
        return ResponseData.success(new UserDetailResponse(u.id(), u.username(), u.email(), u.firstName(),
                u.lastName(), Boolean.TRUE.equals(u.enabled()), u.emailVerified(), u.createdTimestamp(), profile,
                d.realmRoles(), d.permissions()));
    }

    /** Tạo tài khoản nhân viên trong Keycloak và gán role (realm role STAFF/ADMIN + permission). */
    @POST
    public ResponseData<UserAccountService.UserRoles> create(@Valid CreateStaffRequest r) {
        List<String> realmRoles = r.realmRoles() == null || r.realmRoles().isEmpty() ? List.of("STAFF") : r.realmRoles();
        return ResponseData.success(accounts.createStaff(new UserAccountService.NewStaff(r.username(), r.email(),
                r.firstName(), r.lastName(), r.password(), Boolean.TRUE.equals(r.temporaryPassword()),
                realmRoles, r.permissions() == null ? List.of() : r.permissions())));
    }

    /** Đặt lại toàn bộ realm role + permission của ứng dụng (gửi danh sách đầy đủ, không phải phần thêm). */
    @PUT
    @Path("/{id}/roles")
    public ResponseData<UserAccountService.UserRoles> setRoles(@PathParam("id") String id, @Valid RolesRequest r) {
        AuthUser me = currentUser.require();
        if (me.id().toString().equals(id) && !r.realmRoles().contains("ADMIN")) {
            throw new BusinessException(ErrorCode.BAD_REQUEST, "Không thể tự gỡ quyền ADMIN của chính mình");
        }
        return ResponseData.success(accounts.setRoles(id, r.realmRoles(),
                r.permissions() == null ? List.of() : r.permissions()));
    }

    @PUT
    @Path("/{id}/lock")
    public ResponseData<String> lock(@PathParam("id") String id) {
        keycloak.update(id, Map.of("enabled", false));
        return ResponseData.success("Đã khóa tài khoản " + id);
    }

    @PUT
    @Path("/{id}/unlock")
    public ResponseData<String> unlock(@PathParam("id") String id) {
        keycloak.update(id, Map.of("enabled", true));
        return ResponseData.success("Đã mở khóa tài khoản " + id);
    }

    private UserRow toRow(KeycloakUser u) {
        String fullName = ((u.firstName() == null ? "" : u.firstName()) + " "
                + (u.lastName() == null ? "" : u.lastName())).trim();
        String phone = profiles.findByIdOptional(UUID.fromString(u.id()))
                .map(p -> p.phoneNumber).orElse(null);
        return new UserRow(u.id(), u.username(), u.email(), fullName, Boolean.TRUE.equals(u.enabled()), phone);
    }
}
