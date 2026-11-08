package com.pcshop.review;

import com.pcshop.contracts.ResponseData;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.HttpHeaders;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Mono;

import java.time.Duration;

/** Hỏi ordering-service người viết review đã mua SKU chưa (chuyển tiếp access token của chính người đó). */
@Component
public class OrderingClient {

    /** Kết quả GET /api/v1/orders/purchased?sku= của ordering. */
    public record PurchaseCheck(String sku, boolean purchased, String orderCode) {
    }

    private static final Logger log = LoggerFactory.getLogger(OrderingClient.class);
    private static final Duration TIMEOUT = Duration.ofSeconds(3);

    private final WebClient ordering;

    public OrderingClient(WebClient.Builder builder, @Value("${pcshop.services.ordering}") String orderingUrl) {
        this.ordering = builder.clone().baseUrl(orderingUrl).build();
    }

    /**
     * Đơn hoàn tất gần nhất chứa SKU. Ordering lỗi thì coi như CHƯA mua (không chặn việc viết review),
     * review vẫn tạo được nhưng không có nhãn "đã mua hàng".
     */
    public Mono<PurchaseCheck> purchased(String token, String sku) {
        PurchaseCheck notPurchased = new PurchaseCheck(sku, false, null);
        return ordering.get().uri(b -> b.path("/api/v1/orders/purchased").queryParam("sku", sku).build())
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                .retrieve()
                .bodyToMono(new ParameterizedTypeReference<ResponseData<PurchaseCheck>>() {
                })
                .timeout(TIMEOUT)
                .map(ResponseData::data)
                .onErrorResume(e -> {
                    log.warn("Không kiểm tra được lịch sử mua hàng ({}): {}", sku, e.toString());
                    return Mono.just(notPurchased);
                })
                .defaultIfEmpty(notPurchased);
    }
}
