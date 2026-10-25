package com.pcshop.gateway;

import org.springframework.boot.context.properties.ConfigurationProperties;

/** Địa chỉ các service phía sau gateway (khối pcshop.services trong application.yml). */
@ConfigurationProperties(prefix = "pcshop.services")
public record ServiceUrls(
        String customer,
        String catalog,
        String cart,
        String ordering,
        String inventory,
        String review,
        String ai,
        String media,
        String notification) {
}
