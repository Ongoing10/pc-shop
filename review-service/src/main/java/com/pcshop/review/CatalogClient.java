package com.pcshop.review;

import com.pcshop.contracts.BusinessException;
import com.pcshop.contracts.ErrorCode;
import com.pcshop.contracts.ResponseData;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Mono;

import java.time.Duration;
import java.util.List;

/** Tra sản phẩm qua API nội bộ công khai của catalog (POST /products/batch), không cần chuyển token. */
@Component
public class CatalogClient {

    /** Phần cần dùng trong ProductSummary của catalog. status: 2-ACTIVE, 3-HIDDEN, 4-DISCONTINUED (DRAFT bị lọc). */
    public record ProductInfo(String productId, String sku, String name, Integer status) {
    }

    record SkusRequest(List<String> skus) {
    }

    private static final Logger log = LoggerFactory.getLogger(CatalogClient.class);
    private static final Duration TIMEOUT = Duration.ofSeconds(3);

    private final WebClient catalog;

    public CatalogClient(WebClient.Builder builder, @Value("${pcshop.services.catalog}") String catalogUrl) {
        this.catalog = builder.clone().baseUrl(catalogUrl).build();
    }

    /** Sản phẩm đã công bố theo SKU; rỗng nếu không có (hoặc còn Nháp). Catalog lỗi → 502. */
    public Mono<ProductInfo> product(String sku) {
        return catalog.post().uri("/api/v1/products/batch")
                .bodyValue(new SkusRequest(List.of(sku)))
                .retrieve()
                .bodyToMono(new ParameterizedTypeReference<ResponseData<List<ProductInfo>>>() {
                })
                .timeout(TIMEOUT)
                .onErrorMap(e -> {
                    log.warn("Không gọi được catalog-service: {}", e.toString());
                    return new BusinessException(ErrorCode.EXTERNAL_SERVICE_ERROR,
                            "Không kiểm tra được sản phẩm, thử lại sau");
                })
                .flatMap(r -> Mono.justOrEmpty(r.data().stream().filter(p -> sku.equals(p.sku())).findFirst()));
    }
}
