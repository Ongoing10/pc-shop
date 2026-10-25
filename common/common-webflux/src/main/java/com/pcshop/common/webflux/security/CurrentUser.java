package com.pcshop.common.webflux.security;

import com.pcshop.contracts.AuthUser;
import com.pcshop.contracts.BusinessException;
import com.pcshop.contracts.ErrorCode;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.context.ReactiveSecurityContextHolder;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import reactor.core.publisher.Mono;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/**
 * Lấy user hiện tại trong chuỗi reactive (user nằm trong Reactor Context, không ở ThreadLocal).
 * Chỉ gọi bên trong pipeline của request, không gọi block().
 */
public final class CurrentUser {

    private CurrentUser() {
    }

    /** User hiện tại; rỗng nếu chưa đăng nhập. */
    public static Mono<AuthUser> get() {
        return ReactiveSecurityContextHolder.getContext()
                .mapNotNull(SecurityContext::getAuthentication)
                .filter(JwtAuthenticationToken.class::isInstance)
                .cast(JwtAuthenticationToken.class)
                .map(CurrentUser::toAuthUser);
    }

    /** User hiện tại; lỗi 401 nếu chưa đăng nhập. */
    public static Mono<AuthUser> require() {
        return get().switchIfEmpty(Mono.error(
                () -> new BusinessException(ErrorCode.UNAUTHORIZED, "Bạn cần đăng nhập")));
    }

    /** Access token gốc, dùng khi cần gọi service khác. */
    public static Mono<String> token() {
        return ReactiveSecurityContextHolder.getContext()
                .mapNotNull(SecurityContext::getAuthentication)
                .filter(JwtAuthenticationToken.class::isInstance)
                .map(auth -> ((JwtAuthenticationToken) auth).getToken().getTokenValue());
    }

    static AuthUser toAuthUser(JwtAuthenticationToken auth) {
        List<String> roles = new ArrayList<>();
        List<String> permissions = new ArrayList<>();
        for (GrantedAuthority authority : auth.getAuthorities()) {
            String name = authority.getAuthority();
            if (name.startsWith(KeycloakJwtConverter.ROLE_PREFIX)) {
                roles.add(name.substring(KeycloakJwtConverter.ROLE_PREFIX.length()));
            } else {
                permissions.add(name);
            }
        }
        var jwt = auth.getToken();
        return new AuthUser(
                UUID.fromString(jwt.getSubject()),
                jwt.getClaimAsString("preferred_username"),
                jwt.getClaimAsString("email"),
                roles,
                permissions);
    }
}
