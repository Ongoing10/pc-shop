package com.pcshop.ordering.checkout;

import com.pcshop.contracts.BusinessException;
import com.pcshop.contracts.ErrorCode;
import com.pcshop.contracts.ResponseData;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.HttpHeaders;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Mono;

import java.math.BigDecimal;
import java.time.Duration;
import java.util.List;

/**
 * Gọi cart-service (giỏ đã kèm giá/tồn kho) và customer-service (sổ địa chỉ) thay mặt user:
 * chuyển tiếp access token của request hiện tại, nên mỗi service vẫn tự kiểm tra quyền sở hữu.
 */
@Component
public class CheckoutClients {

    public record CartLine(String sku, int quantity, String productId, String name, String imageUrl,
                           String categoryCode, BigDecimal unitPrice, BigDecimal lineTotal, Integer available,
                           boolean purchasable, String message, Integer warrantyMonths) {
    }

    public record Cart(List<CartLine> items, int totalQuantity, BigDecimal subtotal, List<String> warnings) {
    }

    public record Address(Long id, String receiverName, String receiverPhone, String provinceCode,
                          String provinceName, String wardCode, String wardName, String addressDetail,
                          boolean isDefault) {

        public String fullAddress() {
            return addressDetail + ", " + wardName + ", " + provinceName;
        }
    }

    private static final Logger log = LoggerFactory.getLogger(CheckoutClients.class);
    private static final Duration TIMEOUT = Duration.ofSeconds(5);

    private final WebClient cart;
    private final WebClient customer;

    public CheckoutClients(WebClient.Builder builder,
                           @Value("${pcshop.services.cart}") String cartUrl,
                           @Value("${pcshop.services.customer}") String customerUrl) {
        this.cart = builder.clone().baseUrl(cartUrl).build();
        this.customer = builder.clone().baseUrl(customerUrl).build();
    }

    public Mono<Cart> cart(String token) {
        return cart.get().uri("/api/v1/cart")
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                .retrieve()
                .bodyToMono(new ParameterizedTypeReference<ResponseData<Cart>>() {
                })
                .timeout(TIMEOUT)
                .map(ResponseData::data)
                .onErrorMap(e -> !(e instanceof BusinessException), e -> {
                    log.warn("Không gọi được cart-service: {}", e.toString());
                    return new BusinessException(ErrorCode.EXTERNAL_SERVICE_ERROR, "Không lấy được giỏ hàng, thử lại sau");
                });
    }

    /** Địa chỉ của chính user theo id; không có (hoặc của người khác) thì lỗi 400. */
    public Mono<Address> address(String token, long addressId) {
        return customer.get().uri("/api/v1/addresses")
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                .retrieve()
                .bodyToMono(new ParameterizedTypeReference<ResponseData<List<Address>>>() {
                })
                .timeout(TIMEOUT)
                .onErrorMap(e -> {
                    log.warn("Không gọi được customer-service: {}", e.toString());
                    return new BusinessException(ErrorCode.EXTERNAL_SERVICE_ERROR, "Không lấy được địa chỉ, thử lại sau");
                })
                .flatMap(r -> Mono.justOrEmpty(r.data().stream().filter(a -> a.id() == addressId).findFirst()))
                .switchIfEmpty(Mono.error(() -> new BusinessException(ErrorCode.BAD_REQUEST,
                        "Địa chỉ giao hàng không tồn tại trong sổ địa chỉ của bạn")));
    }
}
