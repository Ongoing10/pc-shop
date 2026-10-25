package com.pcshop.cart;

import com.pcshop.common.webflux.security.CurrentUser;
import com.pcshop.contracts.ResponseData;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import org.springframework.data.redis.core.ReactiveStringRedisTemplate;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import reactor.core.publisher.Mono;

import java.util.List;

/**
 * KHUNG: giỏ hàng lưu trong Redis, key cart:{userId} (Hash: sku → số lượng).
 * TODO: giỏ khách vãng lai (cart:guest:{guestKey}, TTL 30 ngày), gộp giỏ khi đăng nhập,
 *       gọi catalog/inventory để lấy giá và tình trạng còn hàng.
 */
@RestController
@RequestMapping("/api/v1/cart")
public class CartController {

    public record CartItem(String sku, int quantity) {
    }

    public record AddItemRequest(@NotBlank String sku, @Min(1) int quantity) {
    }

    private final ReactiveStringRedisTemplate redis;

    public CartController(ReactiveStringRedisTemplate redis) {
        this.redis = redis;
    }

    @GetMapping
    public Mono<ResponseData<List<CartItem>>> myCart() {
        return CurrentUser.require()
                .flatMapMany(user -> redis.<String, String>opsForHash().entries(key(user.id().toString())))
                .map(e -> new CartItem(e.getKey(), Integer.parseInt(e.getValue())))
                .collectList()
                .map(ResponseData::success);
    }

    @PostMapping("/items")
    public Mono<ResponseData<CartItem>> addItem(@Valid @RequestBody AddItemRequest request) {
        return CurrentUser.require()
                .flatMap(user -> redis.<String, String>opsForHash()
                        .increment(key(user.id().toString()), request.sku(), request.quantity()))
                .map(total -> ResponseData.success(new CartItem(request.sku(), total.intValue())));
    }

    @DeleteMapping("/items/{sku}")
    public Mono<ResponseData<Void>> removeItem(@PathVariable String sku) {
        return CurrentUser.require()
                .flatMap(user -> redis.<String, String>opsForHash().remove(key(user.id().toString()), sku))
                .thenReturn(ResponseData.<Void>success(null));
    }

    private static String key(String userId) {
        return "cart:" + userId;
    }
}
