package com.pcshop.ordering.common;

import com.pcshop.common.webflux.security.CurrentUser;
import com.pcshop.contracts.AuthUser;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.domain.ReactiveAuditorAware;
import org.springframework.data.r2dbc.config.EnableR2dbcAuditing;

import java.util.UUID;

/** Điền created_by/updated_by bằng id user trong token; null nếu không có user (vd consumer Kafka). */
@Configuration
@EnableR2dbcAuditing
public class AuditingConfig {

    @Bean
    ReactiveAuditorAware<UUID> auditorAware() {
        return () -> CurrentUser.get().map(AuthUser::id);
    }
}
