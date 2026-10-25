package com.pcshop.customer;

import com.pcshop.contracts.PageResponse;
import com.pcshop.contracts.ResponseData;
import com.pcshop.customer.keycloak.KeycloakAdminApi;
import com.pcshop.customer.keycloak.KeycloakAdminApi.KeycloakUser;
import jakarta.annotation.security.RolesAllowed;
import jakarta.inject.Inject;
import jakarta.ws.rs.DefaultValue;
import jakarta.ws.rs.GET;
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

    @Inject
    CustomerProfileRepository profiles;

    @GET
    public ResponseData<PageResponse<UserRow>> list(@QueryParam("keyword") String keyword,
                                                    @QueryParam("page") @DefaultValue("0") int page,
                                                    @QueryParam("size") @DefaultValue("20") int size) {
        List<UserRow> rows = keycloak.search(keyword, page * size, size, true).stream().map(this::toRow).toList();
        int total = keycloak.count(keyword);
        return ResponseData.success(PageResponse.of(rows, page, size, total));
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
