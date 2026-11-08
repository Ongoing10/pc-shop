package com.pcshop.ordering.checkout;

import com.pcshop.common.webflux.security.CurrentUser;
import com.pcshop.contracts.ResponseData;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import reactor.core.publisher.Mono;

/**
 * Xem trước thanh toán: giá hiện tại (từ giỏ), giảm giá, phí ship, tổng tiền, cảnh báo. KHÔNG tạo đơn;
 * POST /orders tính lại y hệt qua CheckoutService.
 */
@RestController
@RequestMapping("/api/v1/checkout")
public class CheckoutController {

    public record PreviewRequest(String voucherCode, Long addressId) {
    }

    private final CheckoutService checkout;

    public CheckoutController(CheckoutService checkout) {
        this.checkout = checkout;
    }

    @PostMapping("/preview")
    public Mono<ResponseData<CheckoutService.Quote>> preview(@RequestBody(required = false) PreviewRequest body) {
        PreviewRequest request = body == null ? new PreviewRequest(null, null) : body;
        return Mono.zip(CurrentUser.require(), CurrentUser.token())
                .flatMap(t -> checkout.quote(t.getT1(), t.getT2(), request.voucherCode(), request.addressId()))
                .map(ResponseData::success);
    }
}
