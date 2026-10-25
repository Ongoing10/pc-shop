package com.pcshop.common.webflux;

import com.pcshop.common.webflux.security.KeycloakJwtConverter;
import com.pcshop.common.webflux.web.GlobalExceptionHandler;
import org.springframework.boot.autoconfigure.AutoConfiguration;
import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.method.configuration.EnableReactiveMethodSecurity;
import org.springframework.security.config.web.server.ServerHttpSecurity;
import org.springframework.security.web.server.SecurityWebFilterChain;

/**
 * Cấu hình bảo mật chung cho service WebFlux.
 * <ul>
 *   <li>Stateless, tắt CSRF/form login; xác thực bằng JWT của Keycloak.</li>
 *   <li>/actuator/health, pcshop.security.public-paths, pcshop.security.public-get-paths (GET) mở; còn lại cần đăng nhập.</li>
 *   <li>Bật @PreAuthorize cho method trả Mono/Flux.</li>
 * </ul>
 * Service cần luật riêng thì tự khai bean SecurityWebFilterChain (bean của thư viện sẽ lùi lại).
 */
@AutoConfiguration(beforeName = {
        "org.springframework.boot.autoconfigure.security.oauth2.resource.reactive.ReactiveOAuth2ResourceServerAutoConfiguration",
        "org.springframework.boot.autoconfigure.security.reactive.ReactiveSecurityAutoConfiguration"
})
@EnableConfigurationProperties(PcshopSecurityProperties.class)
@Import(GlobalExceptionHandler.class)
public class CommonWebfluxAutoConfiguration {

    @Bean
    @ConditionalOnMissingBean
    public KeycloakJwtConverter keycloakJwtConverter(PcshopSecurityProperties properties) {
        return new KeycloakJwtConverter(properties.getPermissionClientId());
    }

    @Bean
    @ConditionalOnMissingBean(SecurityWebFilterChain.class)
    public SecurityWebFilterChain pcshopSecurityWebFilterChain(ServerHttpSecurity http,
                                                               KeycloakJwtConverter converter,
                                                               PcshopSecurityProperties properties) {
        return http
                .csrf(ServerHttpSecurity.CsrfSpec::disable)
                .httpBasic(ServerHttpSecurity.HttpBasicSpec::disable)
                .formLogin(ServerHttpSecurity.FormLoginSpec::disable)
                .authorizeExchange(ex -> {
                    ex.pathMatchers("/actuator/health/**").permitAll();
                    if (!properties.getPublicPaths().isEmpty()) {
                        ex.pathMatchers(properties.getPublicPaths().toArray(String[]::new)).permitAll();
                    }
                    if (!properties.getPublicGetPaths().isEmpty()) {
                        ex.pathMatchers(HttpMethod.GET, properties.getPublicGetPaths().toArray(String[]::new)).permitAll();
                    }
                    ex.anyExchange().authenticated();
                })
                .oauth2ResourceServer(oauth2 -> oauth2.jwt(jwt -> jwt.jwtAuthenticationConverter(converter)))
                .build();
    }

    @Configuration(proxyBeanMethods = false)
    @EnableReactiveMethodSecurity
    static class MethodSecurity {
    }
}
