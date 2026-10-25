package com.pcshop.contracts;

import java.util.List;
import java.util.UUID;

/**
 * User hiện tại, dựng từ access token. Đây là thứ DUY NHẤT code nghiệp vụ được dùng
 * để biết "ai đang gọi"; chỉ CurrentUser của common-webflux / common-quarkus biết cách đọc token.
 * Đổi nhà cung cấp token (Keycloak ↔ tự viết) chỉ phải sửa chỗ đọc token, không sửa nghiệp vụ.
 *
 * @param id          claim "sub" (UUID của Keycloak)
 * @param username    claim "preferred_username"
 * @param roles       realm role: CUSTOMER, STAFF, ADMIN
 * @param permissions client role của pcshop-backend: product:write, order:update-status...
 */
public record AuthUser(UUID id, String username, String email, List<String> roles, List<String> permissions) {

    public AuthUser {
        roles = roles == null ? List.of() : List.copyOf(roles);
        permissions = permissions == null ? List.of() : List.copyOf(permissions);
    }

    public boolean hasRole(String role) {
        return roles.contains(role);
    }

    public boolean hasPermission(String permission) {
        return permissions.contains(permission);
    }

    public boolean isStaff() {
        return hasRole("STAFF") || hasRole("ADMIN");
    }
}
