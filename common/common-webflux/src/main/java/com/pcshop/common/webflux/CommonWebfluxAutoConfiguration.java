package com.pcshop.common.webflux;

import com.pcshop.common.webflux.security.KeycloakJwtConverter;
import com.pcshop.common.webflux.web.GlobalExceptionHandler;
import com.pcshop.common.webflux.web.RequestIdWebFilter;
import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.security.SecurityRequirement;
import io.swagger.v3.oas.models.security.SecurityScheme;
import org.springframework.beans.factory.annotation.Value;
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
 *   <li>/actuator/health, Swagger UI, pcshop.security.public-paths, pcshop.security.public-get-paths (GET) mở; còn lại cần đăng nhập.</li>
 *   <li>Bật @PreAuthorize cho method trả Mono/Flux.</li>
 *   <li>Swagger UI (/swagger-ui.html) khai sẵn security scheme Bearer JWT; X-Request-Id ghi vào log.</li>
 * </ul>
 * Service cần luật riêng thì tự khai bean SecurityWebFilterChain (bean của thư viện sẽ lùi lại).
 */
@AutoConfiguration(beforeName = {
        "org.springframework.boot.autoconfigure.security.oauth2.resource.reactive.ReactiveOAuth2ResourceServerAutoConfiguration",
        "org.springframework.boot.autoconfigure.security.reactive.ReactiveSecurityAutoConfiguration"
})
@EnableConfigurationProperties(PcshopSecurityProperties.class)
@Import({GlobalExceptionHandler.class, RequestIdWebFilter.class})
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
                    ex.pathMatchers("/actuator/health/**", "/swagger-ui.html", "/swagger-ui/**",
                            "/v3/api-docs/**", "/webjars/**").permitAll();
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

    /** Nút "Authorize" trên Swagger UI: dán access token lấy từ Keycloak (README mục 5). */
    @Bean
    @ConditionalOnMissingBean
    public OpenAPI pcshopOpenApi(@Value("${spring.application.name:pcshop}") String appName) {
        return new OpenAPI()
                .info(new Info().title(appName).version("v1"))
                .components(new Components().addSecuritySchemes("bearer", new SecurityScheme()
                        .type(SecurityScheme.Type.HTTP).scheme("bearer").bearerFormat("JWT")))
                .addSecurityItem(new SecurityRequirement().addList("bearer"));
    }

    @Configuration(proxyBeanMethods = false)
    @EnableReactiveMethodSecurity
    static class MethodSecurity {
    }
}
