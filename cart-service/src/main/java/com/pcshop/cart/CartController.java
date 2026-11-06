package com.pcshop.cart;

import com.pcshop.common.webflux.security.CurrentUser;
import com.pcshop.contracts.BulkErrors;
import com.pcshop.contracts.ResponseData;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import reactor.core.publisher.Mono;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Giỏ hàng. Đã đăng nhập: giỏ của tài khoản. Chưa đăng nhập: giỏ khách vãng lai theo header X-Guest-Key
 * (đường dẫn /api/v1/cart/** mở công khai trong application.yml; riêng /merge bắt buộc đăng nhập).
 * Mọi thao tác ghi trả về giỏ đầy đủ (kèm giá, tồn kho) để frontend cập nhật một lần.
 */
@RestController
@RequestMapping("/api/v1/cart")
public class CartController {

    public static final String GUEST_HEADER = "X-Guest-Key";

    public record AddItemRequest(@NotBlank String sku, @Min(1) @Max(CartService.MAX_QUANTITY_PER_ITEM) int quantity) {
    }

    public record BulkAddRequest(@NotEmpty @Size(max = BulkErrors.MAX_ITEMS) List<@Valid AddItemRequest> items) {
    }

    public record SetQuantityRequest(@Min(0) @Max(CartService.MAX_QUANTITY_PER_ITEM) int quantity) {
    }

    private final CartService carts;

    public CartController(CartService carts) {
        this.carts = carts;
    }

    @GetMapping
    public Mono<ResponseData<CartService.CartView>> myCart(@RequestHeader(value = GUEST_HEADER, required = false) String guestKey) {
        return carts.resolve(guestKey).flatMap(carts::view).map(ResponseData::success);
    }

    /** Thêm vào giỏ (cộng dồn nếu đã có). */
    @PostMapping("/items")
    public Mono<ResponseData<CartService.CartView>> addItem(@RequestHeader(value = GUEST_HEADER, required = false) String guestKey,
                                                            @Valid @RequestBody AddItemRequest request) {
        return carts.resolve(guestKey)
                .flatMap(cart -> carts.add(cart, request.sku(), request.quantity()).then(carts.view(cart)))
                .map(ResponseData::success);
    }

    /** Thêm nhiều món một lần (vd "Thêm cả cấu hình PC vào giỏ"); một món lỗi thì không thêm gì. */
    @PostMapping("/items/bulk")
    public Mono<ResponseData<CartService.CartView>> addItems(@RequestHeader(value = GUEST_HEADER, required = false) String guestKey,
                                                             @Valid @RequestBody BulkAddRequest request) {
        BulkErrors.check(request.items().stream().map(AddItemRequest::sku).toList());
        Map<String, Integer> lines = new LinkedHashMap<>();
        request.items().forEach(i -> lines.put(i.sku(), i.quantity()));
        return carts.resolve(guestKey)
                .flatMap(cart -> carts.addAll(cart, lines).then(carts.view(cart)))
                .map(ResponseData::success);
    }

    /** Đặt số lượng tuyệt đối; 0 = xóa khỏi giỏ. */
    @PutMapping("/items/{sku}")
    public Mono<ResponseData<CartService.CartView>> setQuantity(@RequestHeader(value = GUEST_HEADER, required = false) String guestKey,
                                                                @PathVariable String sku,
                                                                @Valid @RequestBody SetQuantityRequest request) {
        return carts.resolve(guestKey)
                .flatMap(cart -> carts.set(cart, sku, request.quantity()).then(carts.view(cart)))
                .map(ResponseData::success);
    }

    @DeleteMapping("/items/{sku}")
    public Mono<ResponseData<CartService.CartView>> removeItem(@RequestHeader(value = GUEST_HEADER, required = false) String guestKey,
                                                               @PathVariable String sku) {
        return carts.resolve(guestKey)
                .flatMap(cart -> carts.remove(cart, sku).then(carts.view(cart)))
                .map(ResponseData::success);
    }

    /** Xóa hết giỏ. */
    @DeleteMapping
    public Mono<ResponseData<Void>> clear(@RequestHeader(value = GUEST_HEADER, required = false) String guestKey) {
        return carts.resolve(guestKey).flatMap(carts::clear).thenReturn(ResponseData.<Void>success(null));
    }

    /** Sau khi đăng nhập: gộp giỏ guest (header X-Guest-Key) vào giỏ tài khoản rồi xóa giỏ guest. */
    @PostMapping("/merge")
    public Mono<ResponseData<CartService.CartView>> merge(@RequestHeader(GUEST_HEADER) String guestKey) {
        return CurrentUser.require()
                .flatMap(user -> carts.merge(user.id().toString(), guestKey).then(carts.resolve(null)))
                .flatMap(carts::view)
                .map(ResponseData::success);
    }
}
