package com.pcshop.gateway;

import org.springframework.cloud.gateway.route.RouteLocator;
import org.springframework.cloud.gateway.route.builder.RouteLocatorBuilder;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.reactive.CorsWebFilter;
import org.springframework.web.cors.reactive.UrlBasedCorsConfigurationSource;

import java.time.Duration;
import java.util.List;

/**
 * Gateway chỉ định tuyến và xử lý CORS; header Authorization được chuyển nguyên cho service,
 * mỗi service tự kiểm tra JWT. Route khai bằng Java để không phụ thuộc tên property của Gateway.
 */
@Configuration
public class GatewayConfig {

    @Bean
    RouteLocator routes(RouteLocatorBuilder builder, ServiceUrls urls) {
        return builder.routes()
                .route("customer", r -> r.path("/api/v1/me/**", "/api/v1/customers/**", "/api/v1/admin/users/**")
                        .uri(urls.customer()))
                .route("catalog", r -> r.path("/api/v1/products/**", "/api/v1/categories/**", "/api/v1/brands/**",
                                "/api/v1/compatibility/**", "/api/v1/pc-builds/**")
                        .uri(urls.catalog()))
                .route("cart", r -> r.path("/api/v1/cart/**").uri(urls.cart()))
                .route("ordering", r -> r.path("/api/v1/orders/**", "/api/v1/vouchers/**", "/api/v1/payments/**")
                        .uri(urls.ordering()))
                .route("inventory", r -> r.path("/api/v1/inventory/**", "/api/v1/warehouses/**")
                        .uri(urls.inventory()))
                .route("review", r -> r.path("/api/v1/reviews/**").uri(urls.review()))
                // Chat AI trả về dạng stream: gateway chuyển tiếp nguyên, không đệm
                .route("ai", r -> r.path("/api/v1/ai/**").uri(urls.ai()))
                .route("media", r -> r.path("/api/v1/media/**").uri(urls.media()))
                .route("notification", r -> r.path("/api/v1/notifications/**").uri(urls.notification()))
                .build();
    }

    /** CORS đặt một chỗ ở gateway; các service phía sau không cần cấu hình CORS. */
    @Bean
    CorsWebFilter corsWebFilter(org.springframework.core.env.Environment env) {
        CorsConfiguration config = new CorsConfiguration();
        config.setAllowedOrigins(List.of(env.getProperty("pcshop.cors.allowed-origin", "http://localhost:3000")));
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        config.setAllowedHeaders(List.of("*"));
        config.setExposedHeaders(List.of("Content-Disposition"));
        config.setAllowCredentials(true);
        config.setMaxAge(Duration.ofHours(1));
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return new CorsWebFilter(source);
    }
}
