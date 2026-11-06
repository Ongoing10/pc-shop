package com.pcshop.customer;

import com.pcshop.contracts.BusinessException;
import com.pcshop.contracts.ErrorCode;
import com.pcshop.customer.keycloak.KeycloakAdminApi;
import com.pcshop.customer.keycloak.KeycloakAdminApi.KeycloakRole;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.ws.rs.WebApplicationException;
import jakarta.ws.rs.core.Response;
import org.eclipse.microprofile.config.inject.ConfigProperty;
import org.eclipse.microprofile.rest.client.inject.RestClient;
import org.jboss.logging.Logger;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.function.Supplier;

/**
 * Quản lý tài khoản qua Keycloak Admin REST API: tạo tài khoản nhân viên, đồng bộ realm role và permission.
 * Chỉ đụng tới role của ứng dụng (CUSTOMER/STAFF/ADMIN và client role của pcshop-backend);
 * role hệ thống của Keycloak (default-roles-pcshop, offline_access...) giữ nguyên.
 */
@ApplicationScoped
public class UserAccountService {

    public static final Set<String> APP_REALM_ROLES = Set.of("CUSTOMER", "STAFF", "ADMIN");
    public static final Set<String> APP_PERMISSIONS =
            Set.of("product:write", "order:update-status", "inventory:write", "knowledge:write");

    public record NewStaff(String username, String email, String firstName, String lastName, String password,
                           boolean temporaryPassword, List<String> realmRoles, List<String> permissions) {
    }

    public record UserRoles(String userId, List<String> realmRoles, List<String> permissions) {
    }

    private static final Logger log = Logger.getLogger(UserAccountService.class);

    @Inject
    @RestClient
    KeycloakAdminApi keycloak;

    @ConfigProperty(name = "pcshop.security.permission-client-id", defaultValue = "pcshop-backend")
    String permissionClientId;

    /** Tạo tài khoản (đã kích hoạt, email coi như đã xác minh) rồi gán role. Trả về id (sub) của user mới. */
    public UserRoles createStaff(NewStaff s) {
        validate(s.realmRoles(), s.permissions());
        if (s.realmRoles().stream().noneMatch(r -> r.equals("STAFF") || r.equals("ADMIN"))) {
            throw new BusinessException(ErrorCode.BAD_REQUEST, "Tài khoản nhân viên cần realm role STAFF hoặc ADMIN");
        }
        Map<String, Object> user = new HashMap<>();
        user.put("username", s.username());
        user.put("email", s.email());
        user.put("firstName", s.firstName());
        user.put("lastName", s.lastName());
        user.put("enabled", true);
        user.put("emailVerified", true);
        user.put("credentials", List.of(Map.of("type", "password", "value", s.password(),
                "temporary", s.temporaryPassword())));

        String userId;
        try (Response response = call(() -> keycloak.create(user))) {
            String location = response.getHeaderString("Location");
            if (location == null) {
                throw new BusinessException(ErrorCode.EXTERNAL_SERVICE_ERROR, "Keycloak không trả về id user mới");
            }
            userId = location.substring(location.lastIndexOf('/') + 1);
        }
        try {
            return setRoles(userId, s.realmRoles(), s.permissions());
        } catch (RuntimeException e) {
            log.errorf(e, "Đã tạo user %s (%s) nhưng gán role lỗi", s.username(), userId);
            throw new BusinessException(ErrorCode.EXTERNAL_SERVICE_ERROR,
                    "Đã tạo tài khoản " + userId + " nhưng gán quyền lỗi, hãy gán lại bằng PUT /admin/users/" + userId + "/roles");
        }
    }

    /** Đặt lại toàn bộ realm role và permission của ứng dụng cho user (thêm cái thiếu, gỡ cái thừa). */
    public UserRoles setRoles(String userId, List<String> realmRoles, List<String> permissions) {
        validate(realmRoles, permissions);
        call(() -> keycloak.get(userId));   // 404 rõ ràng nếu user không tồn tại

        List<KeycloakRole> currentRealm = call(() -> keycloak.userRealmRoles(userId)).stream()
                .filter(r -> APP_REALM_ROLES.contains(r.name())).toList();
        List<KeycloakRole> addRealm = new ArrayList<>();
        for (String name : new LinkedHashSet<>(realmRoles)) {
            if (currentRealm.stream().noneMatch(r -> r.name().equals(name))) {
                addRealm.add(call(() -> keycloak.realmRole(name)));
            }
        }
        List<KeycloakRole> removeRealm = currentRealm.stream().filter(r -> !realmRoles.contains(r.name())).toList();
        if (!addRealm.isEmpty()) {
            call(() -> { keycloak.addRealmRoles(userId, addRealm); return null; });
        }
        if (!removeRealm.isEmpty()) {
            call(() -> { keycloak.removeRealmRoles(userId, removeRealm); return null; });
        }

        String clientUuid = permissionClientUuid();
        List<KeycloakRole> currentPerms = call(() -> keycloak.userClientRoles(userId, clientUuid));
        List<KeycloakRole> addPerms = new ArrayList<>();
        for (String name : new LinkedHashSet<>(permissions)) {
            if (currentPerms.stream().noneMatch(r -> r.name().equals(name))) {
                addPerms.add(call(() -> keycloak.clientRole(clientUuid, name)));
            }
        }
        List<KeycloakRole> removePerms = currentPerms.stream().filter(r -> !permissions.contains(r.name())).toList();
        if (!addPerms.isEmpty()) {
            call(() -> { keycloak.addClientRoles(userId, clientUuid, addPerms); return null; });
        }
        if (!removePerms.isEmpty()) {
            call(() -> { keycloak.removeClientRoles(userId, clientUuid, removePerms); return null; });
        }
        return new UserRoles(userId, List.copyOf(new LinkedHashSet<>(realmRoles)),
                List.copyOf(new LinkedHashSet<>(permissions)));
    }

    /** Tài khoản Keycloak + role hiện tại của ứng dụng (form "Đặt quyền" cần giá trị đang có). */
    public UserDetail detail(String userId) {
        KeycloakAdminApi.KeycloakUser user = call(() -> keycloak.get(userId));
        List<String> realmRoles = call(() -> keycloak.userRealmRoles(userId)).stream()
                .map(KeycloakRole::name).filter(APP_REALM_ROLES::contains).sorted().toList();
        String clientUuid = permissionClientUuid();
        List<String> permissions = call(() -> keycloak.userClientRoles(userId, clientUuid)).stream()
                .map(KeycloakRole::name).filter(APP_PERMISSIONS::contains).sorted().toList();
        return new UserDetail(user, realmRoles, permissions);
    }

    public record UserDetail(KeycloakAdminApi.KeycloakUser account, List<String> realmRoles, List<String> permissions) {
    }

    // ------------------------------------------------------------------

    private String permissionClientUuid() {
        return call(() -> keycloak.findClients(permissionClientId)).stream()
                .filter(c -> permissionClientId.equals(c.clientId()))
                .findFirst()
                .orElseThrow(() -> new BusinessException(ErrorCode.EXTERNAL_SERVICE_ERROR,
                        "Không tìm thấy client " + permissionClientId + " trong Keycloak"))
                .id();
    }

    private static void validate(List<String> realmRoles, List<String> permissions) {
        List<String> badRoles = realmRoles.stream().filter(r -> !APP_REALM_ROLES.contains(r)).toList();
        if (!badRoles.isEmpty()) {
            throw new BusinessException(ErrorCode.BAD_REQUEST, "Realm role không hợp lệ: " + badRoles + ", chỉ nhận " + APP_REALM_ROLES);
        }
        List<String> badPerms = permissions.stream().filter(p -> !APP_PERMISSIONS.contains(p)).toList();
        if (!badPerms.isEmpty()) {
            throw new BusinessException(ErrorCode.BAD_REQUEST, "Permission không hợp lệ: " + badPerms + ", chỉ nhận " + APP_PERMISSIONS);
        }
    }

    /** Lỗi HTTP từ Keycloak → BusinessException có nghĩa với client của mình. */
    private static <T> T call(Supplier<T> action) {
        try {
            return action.get();
        } catch (WebApplicationException e) {
            int status = e.getResponse() == null ? 500 : e.getResponse().getStatus();
            switch (status) {
                case 404 -> throw new BusinessException(ErrorCode.NOT_FOUND, "Keycloak: không tìm thấy user/role");
                case 409 -> throw new BusinessException(ErrorCode.CONFLICT, "Username hoặc email đã tồn tại");
                case 400 -> throw new BusinessException(ErrorCode.BAD_REQUEST, "Keycloak từ chối dữ liệu (kiểm tra chính sách mật khẩu, email)");
                case 401, 403 -> throw new BusinessException(ErrorCode.EXTERNAL_SERVICE_ERROR,
                        "Service account pcshop-backend thiếu quyền realm-management (cần view-users, manage-users, view-realm, view-clients)");
                default -> throw new BusinessException(ErrorCode.EXTERNAL_SERVICE_ERROR, "Keycloak lỗi HTTP " + status);
            }
        }
    }
}
