package com.pcshop.common.quarkus;

import com.pcshop.contracts.AuthUser;
import com.pcshop.contracts.BusinessException;
import com.pcshop.contracts.ErrorCode;
import io.quarkus.security.identity.SecurityIdentity;
import jakarta.enterprise.context.RequestScoped;
import jakarta.inject.Inject;
import jakarta.json.JsonArray;
import jakarta.json.JsonObject;
import jakarta.json.JsonString;
import jakarta.json.JsonValue;
import org.eclipse.microprofile.config.inject.ConfigProperty;
import org.eclipse.microprofile.jwt.JsonWebToken;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * User hiện tại, đọc từ access token của Keycloak. Code nghiệp vụ chỉ dùng {@link AuthUser},
 * không đọc claim trực tiếp.
 */
@RequestScoped
public class CurrentUser {

    @Inject
    SecurityIdentity identity;

    @Inject
    JsonWebToken jwt;

    @ConfigProperty(name = "pcshop.security.permission-client-id", defaultValue = "pcshop-backend")
    String permissionClientId;

    /** User hiện tại; rỗng nếu chưa đăng nhập. */
    public Optional<AuthUser> get() {
        if (identity.isAnonymous() || jwt.getSubject() == null) {
            return Optional.empty();
        }
        return Optional.of(new AuthUser(
                UUID.fromString(jwt.getSubject()),
                jwt.getClaim("preferred_username"),
                jwt.getClaim("email"),
                jwt.getClaim("name"),
                realmRoles(),
                clientRoles()));
    }

    /** User hiện tại; lỗi 401 nếu chưa đăng nhập. */
    public AuthUser require() {
        return get().orElseThrow(() -> new BusinessException(ErrorCode.UNAUTHORIZED, "Bạn cần đăng nhập"));
    }

    /** Lỗi 403 nếu user không có permission (client role) này. */
    public AuthUser requirePermission(String permission) {
        AuthUser user = require();
        if (!user.hasPermission(permission)) {
            throw BusinessException.forbidden("Thiếu quyền " + permission);
        }
        return user;
    }

    private List<String> realmRoles() {
        JsonObject realmAccess = jwt.getClaim("realm_access");
        return realmAccess == null ? List.of() : strings(realmAccess.get("roles"));
    }

    private List<String> clientRoles() {
        JsonObject resourceAccess = jwt.getClaim("resource_access");
        if (resourceAccess == null || !(resourceAccess.get(permissionClientId) instanceof JsonObject client)) {
            return List.of();
        }
        return strings(client.get("roles"));
    }

    private static List<String> strings(JsonValue value) {
        List<String> result = new ArrayList<>();
        if (value instanceof JsonArray array) {
            for (JsonValue item : array) {
                if (item instanceof JsonString s) {
                    result.add(s.getString());
                }
            }
        }
        return result;
    }
}
