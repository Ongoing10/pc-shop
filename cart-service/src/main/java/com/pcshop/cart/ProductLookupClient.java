package com.pcshop.cart;

import com.pcshop.contracts.ResponseData;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Mono;

import java.math.BigDecimal;
import java.time.Duration;
import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * Gọi API nội bộ của catalog (POST /products/batch) và inventory (POST /inventory/batch), mỗi bên một request
 * cho cả giỏ (tránh N+1). Hai API này công khai nên không cần chuyển token.
 */
@Component
public class ProductLookupClient {

    /** Phần cần dùng trong ProductSummary của catalog. */
    public record ProductInfo(String productId, String sku, String name, String slug, String categoryCode,
                              BigDecimal price, BigDecimal originalPrice, String imageUrl, Integer status,
                              Integer warrantyMonths) {
    }

    public record StockInfo(String sku, int available, boolean inStock) {
    }

    record SkusRequest(Collection<String> skus) {
    }

    private static final Logger log = LoggerFactory.getLogger(ProductLookupClient.class);
    private static final Duration TIMEOUT = Duration.ofSeconds(3);

    private final WebClient catalog;
    private final WebClient inventory;

    public ProductLookupClient(WebClient.Builder builder,
                               @Value("${pcshop.services.catalog}") String catalogUrl,
                               @Value("${pcshop.services.inventory}") String inventoryUrl) {
        this.catalog = builder.clone().baseUrl(catalogUrl).build();
        this.inventory = builder.clone().baseUrl(inventoryUrl).build();
    }

    /** SKU → sản phẩm; service lỗi/không chạy thì trả Mono lỗi để bên gọi quyết định. */
    public Mono<Map<String, ProductInfo>> products(Collection<String> skus) {
        return catalog.post().uri("/api/v1/products/batch")
                .bodyValue(new SkusRequest(skus))
                .retrieve()
                .bodyToMono(new ParameterizedTypeReference<ResponseData<List<ProductInfo>>>() {
                })
                .timeout(TIMEOUT)
                .map(r -> r.data().stream().collect(Collectors.toMap(ProductInfo::sku, Function.identity())))
                .doOnError(e -> log.warn("Không gọi được catalog-service: {}", e.toString()));
    }

    public Mono<Map<String, StockInfo>> stocks(Collection<String> skus) {
        return inventory.post().uri("/api/v1/inventory/batch")
                .bodyValue(new SkusRequest(skus))
                .retrieve()
                .bodyToMono(new ParameterizedTypeReference<ResponseData<List<StockInfo>>>() {
                })
                .timeout(TIMEOUT)
                .map(r -> r.data().stream().collect(Collectors.toMap(StockInfo::sku, Function.identity())))
                .doOnError(e -> log.warn("Không gọi được inventory-service: {}", e.toString()));
    }
}
