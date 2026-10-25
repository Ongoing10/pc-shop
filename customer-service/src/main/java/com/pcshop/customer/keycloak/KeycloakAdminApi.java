package com.pcshop.customer.keycloak;

import io.quarkus.oidc.client.filter.OidcClientFilter;
import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.PUT;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;
import jakarta.ws.rs.QueryParam;
import jakarta.ws.rs.core.MediaType;
import org.eclipse.microprofile.rest.client.inject.RegisterRestClient;

import java.util.List;
import java.util.Map;

/**
 * Keycloak Admin REST API: chỉ là HTTP API bình thường.
 * {@code @OidcClientFilter}: tự xin token cho service bằng client credentials (cấu hình quarkus.oidc-client.*)
 * và gắn vào header Authorization. Service account của pcshop-backend đã có quyền view-users, manage-users.
 */
@RegisterRestClient(configKey = "keycloak-admin")
@OidcClientFilter
@Path("/admin/realms/pcshop")
public interface KeycloakAdminApi {

    record KeycloakUser(String id, String username, String email, String firstName, String lastName,
                        Boolean enabled, Boolean emailVerified, Long createdTimestamp) {
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

    /** Cập nhật một phần, vd {"enabled": false} để khóa tài khoản. */
    @PUT
    @Path("/users/{id}")
    @Consumes(MediaType.APPLICATION_JSON)
    void update(@PathParam("id") String id, Map<String, Object> changes);
}
