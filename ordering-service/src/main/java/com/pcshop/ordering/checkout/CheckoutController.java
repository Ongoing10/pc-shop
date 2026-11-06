package com.pcshop.ordering.checkout;

import com.pcshop.common.webflux.security.CurrentUser;
import com.pcshop.contracts.AuthUser;
import com.pcshop.contracts.BusinessException;
import com.pcshop.contracts.ErrorCode;
import com.pcshop.contracts.ResponseData;
import com.pcshop.ordering.voucher.VoucherService;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import reactor.core.publisher.Mono;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;

/**
 * Xem trước thanh toán: giá hiện tại (từ giỏ), giảm giá, phí ship, tổng tiền, cảnh báo. KHÔNG tạo đơn
 * (POST /orders + giữ hàng qua Saga ở đợt 2 sẽ tính lại y hệt, không tin số liệu client gửi lên).
 */
@RestController
@RequestMapping("/api/v1/checkout")
public class CheckoutController {

    public record PreviewRequest(String voucherCode, Long addressId) {
    }

    public record PreviewResponse(List<CheckoutClients.CartLine> items, BigDecimal subtotal, BigDecimal discountAmount,
                                  BigDecimal shippingFee, BigDecimal totalAmount, VoucherService.Evaluation voucher,
                                  CheckoutClients.Address address, List<String> warnings, boolean canPlaceOrder) {
    }

    private final CheckoutClients clients;
    private final VoucherService vouchers;
    private final ShippingProperties shipping;

    public CheckoutController(CheckoutClients clients, VoucherService vouchers, ShippingProperties shipping) {
        this.clients = clients;
        this.vouchers = vouchers;
        this.shipping = shipping;
    }

    @PostMapping("/preview")
    public Mono<ResponseData<PreviewResponse>> preview(@RequestBody(required = false) PreviewRequest body) {
        PreviewRequest request = body == null ? new PreviewRequest(null, null) : body;
        return Mono.zip(CurrentUser.require(), CurrentUser.token())
                .flatMap(t -> {
                    AuthUser user = t.getT1();
                    String token = t.getT2();
                    Mono<Optional<CheckoutClients.Address>> address = request.addressId() == null
                            ? Mono.just(Optional.empty())
                            : clients.address(token, request.addressId()).map(Optional::of);
                    return Mono.zip(clients.cart(token), address)
                            .flatMap(ca -> compute(user, ca.getT1(), ca.getT2().orElse(null), request.voucherCode()));
                })
                .map(ResponseData::success);
    }

    private Mono<PreviewResponse> compute(AuthUser user, CheckoutClients.Cart cart, CheckoutClients.Address address,
                                          String voucherCode) {
        if (cart.items() == null || cart.items().isEmpty()) {
            return Mono.error(new BusinessException(ErrorCode.BAD_REQUEST, "Giỏ hàng trống"));
        }
        List<String> warnings = new ArrayList<>(cart.warnings() == null ? List.of() : cart.warnings());
        List<CheckoutClients.CartLine> buyable = cart.items().stream()
                .filter(l -> l.purchasable() && l.lineTotal() != null).toList();
        cart.items().stream().filter(l -> !l.purchasable() && l.message() != null)
                .forEach(l -> warnings.add((l.name() == null ? l.sku() : l.name()) + ": " + l.message()));
        BigDecimal subtotal = buyable.stream().map(CheckoutClients.CartLine::lineTotal)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        Set<String> categories = new LinkedHashSet<>();
        buyable.forEach(l -> {
            if (l.categoryCode() != null) {
                categories.add(l.categoryCode());
            }
        });
        if (address == null) {
            warnings.add("Chưa chọn địa chỉ giao hàng, phí vận chuyển đang tính theo mức ngoại vùng");
        }

        Mono<Optional<VoucherService.Evaluation>> voucher = voucherCode == null || voucherCode.isBlank()
                ? Mono.just(Optional.empty())
                : vouchers.applicableCategories(voucherCode).flatMap(allowed -> {
                    BigDecimal eligible = buyable.stream()
                            .filter(l -> allowed.isEmpty() || allowed.contains(l.categoryCode()))
                            .map(CheckoutClients.CartLine::lineTotal)
                            .reduce(BigDecimal.ZERO, BigDecimal::add);
                    return vouchers.evaluate(voucherCode, user.id(), subtotal, eligible, categories);
                }).map(Optional::of);

        return voucher.map(opt -> {
            VoucherService.Evaluation ev = opt.orElse(null);
            boolean valid = ev != null && ev.valid();
            if (ev != null && !valid) {
                warnings.add("Mã giảm giá: " + ev.reason());
            }
            BigDecimal discount = valid ? ev.discountAmount() : BigDecimal.ZERO;
            BigDecimal afterDiscount = subtotal.subtract(discount).max(BigDecimal.ZERO);
            BigDecimal fee = valid && ev.freeShipping()
                    ? BigDecimal.ZERO
                    : shipping.feeFor(address == null ? null : address.provinceCode(), afterDiscount);
            boolean canPlace = !buyable.isEmpty() && buyable.size() == cart.items().size() && address != null;
            return new PreviewResponse(cart.items(), subtotal, discount, fee, afterDiscount.add(fee), ev, address,
                    List.copyOf(warnings), canPlace);
        });
    }
}
