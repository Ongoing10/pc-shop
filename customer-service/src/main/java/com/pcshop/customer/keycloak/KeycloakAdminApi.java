package com.pcshop.customer.keycloak;

import io.quarkus.oidc.client.filter.OidcClientFilter;
import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.DELETE;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.PUT;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;
import jakarta.ws.rs.QueryParam;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import org.eclipse.microprofile.rest.client.inject.RegisterRestClient;

import java.util.List;
import java.util.Map;

/**
 * Keycloak Admin REST API: chỉ là HTTP API bình thường.
 * {@code @OidcClientFilter}: tự xin token cho service bằng client credentials (cấu hình quarkus.oidc-client.*)
 * và gắn vào header Authorization. Service account của pcshop-backend cần các role của realm-management:
 * view-users, manage-users (đọc/sửa user, gán role), view-realm (đọc realm role), view-clients (tìm client và client role).
 */
@RegisterRestClient(configKey = "keycloak-admin")
@OidcClientFilter
@Path("/admin/realms/pcshop")
public interface KeycloakAdminApi {

    record KeycloakUser(String id, String username, String email, String firstName, String lastName,
                        Boolean enabled, Boolean emailVerified, Long createdTimestamp) {
    }

    /** RoleRepresentation rút gọn; gán/gỡ role cần gửi lại đúng id + name lấy từ Keycloak. */
    record KeycloakRole(String id, String name, String description, Boolean composite, Boolean clientRole,
                        String containerId) {
    }

    record KeycloakClient(String id, String clientId) {
    }

    @GET
    @Path("/users")
    List<KeycloakUser> search(@QueryParam("search") String search,
                              @QueryParam("first") int first,
                              @QueryParam("max") int max,
                              @QueryParam("briefRepresentation") boolean briefRepresentation);

    @GET
    @Path("/users/count")
    int count(@QueryParam("search") String search);

    @GET
    @Path("/users/{id}")
    KeycloakUser get(@PathParam("id") String id);

    /**
     * Tạo user (UserRepresentation dạng Map). Thành công: 201, id user nằm cuối header Location.
     * Trả Response để tự đọc Location; trùng username/email: Keycloak trả 409.
     */
    @POST
    @Path("/users")
    @Consumes(MediaType.APPLICATION_JSON)
    Response create(Map<String, Object> user);

    /** Cập nhật một phần, vd {"enabled": false} để khóa tài khoản. */
    @PUT
    @Path("/users/{id}")
    @Consumes(MediaType.APPLICATION_JSON)
    void update(@PathParam("id") String id, Map<String, Object> changes);

    // ------------------------------------------------------------------ realm role

    @GET
    @Path("/roles/{name}")
    KeycloakRole realmRole(@PathParam("name") String name);

    @GET
    @Path("/users/{id}/role-mappings/realm")
    List<KeycloakRole> userRealmRoles(@PathParam("id") String id);

    @POST
    @Path("/users/{id}/role-mappings/realm")
    @Consumes(MediaType.APPLICATION_JSON)
    void addRealmRoles(@PathParam("id") String id, List<KeycloakRole> roles);

    /** Keycloak yêu cầu DELETE có body (danh sách role cần gỡ). */
    @DELETE
    @Path("/users/{id}/role-mappings/realm")
    @Consumes(MediaType.APPLICATION_JSON)
    void removeRealmRoles(@PathParam("id") String id, List<KeycloakRole> roles);

    // ------------------------------------------------------------------ client role (permission)

    /** Tìm client theo clientId (vd pcshop-backend) để lấy id nội bộ (UUID). */
    @GET
    @Path("/clients")
    List<KeycloakClient> findClients(@QueryParam("clientId") String clientId);

    @GET
    @Path("/clients/{clientUuid}/roles/{name}")
    KeycloakRole clientRole(@PathParam("clientUuid") String clientUuid, @PathParam("name") String name);

    @GET
    @Path("/users/{id}/role-mappings/clients/{clientUuid}")
    List<KeycloakRole> userClientRoles(@PathParam("id") String id, @PathParam("clientUuid") String clientUuid);

    @POST
    @Path("/users/{id}/role-mappings/clients/{clientUuid}")
    @Consumes(MediaType.APPLICATION_JSON)
    void addClientRoles(@PathParam("id") String id, @PathParam("clientUuid") String clientUuid,
                        List<KeycloakRole> roles);

    @DELETE
    @Path("/users/{id}/role-mappings/clients/{clientUuid}")
    @Consumes(MediaType.APPLICATION_JSON)
    void removeClientRoles(@PathParam("id") String id, @PathParam("clientUuid") String clientUuid,
                           List<KeycloakRole> roles);
}
