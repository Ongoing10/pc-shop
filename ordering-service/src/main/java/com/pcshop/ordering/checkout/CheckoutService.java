package com.pcshop.ordering.checkout;

import com.pcshop.contracts.AuthUser;
import com.pcshop.contracts.BusinessException;
import com.pcshop.contracts.ErrorCode;
import com.pcshop.ordering.voucher.VoucherService;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Mono;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;

/**
 * Tính tiền từ giỏ hàng hiện tại: giá (từ giỏ), giảm giá, phí ship, tổng, cảnh báo.
 * Dùng chung cho POST /checkout/preview và POST /orders, nên số tiền khi đặt luôn khớp với lúc xem trước
 * (không tin số liệu client gửi lên).
 */
@Service
public class CheckoutService {

    public record Quote(List<CheckoutClients.CartLine> items, BigDecimal subtotal, BigDecimal discountAmount,
                        BigDecimal shippingFee, BigDecimal totalAmount, VoucherService.Evaluation voucher,
                        CheckoutClients.Address address, List<String> warnings, boolean canPlaceOrder) {
    }

    private final CheckoutClients clients;
    private final VoucherService vouchers;
    private final ShippingProperties shipping;

    public CheckoutService(CheckoutClients clients, VoucherService vouchers, ShippingProperties shipping) {
        this.clients = clients;
        this.vouchers = vouchers;
        this.shipping = shipping;
    }

    /** {@code token}: access token của user, chuyển tiếp sang cart/customer. addressId, voucherCode có thể null. */
    public Mono<Quote> quote(AuthUser user, String token, String voucherCode, Long addressId) {
        Mono<Optional<CheckoutClients.Address>> address = addressId == null
                ? Mono.just(Optional.empty())
                : clients.address(token, addressId).map(Optional::of);
        return Mono.zip(clients.cart(token), address)
                .flatMap(ca -> compute(user, ca.getT1(), ca.getT2().orElse(null), voucherCode));
    }

    private Mono<Quote> compute(AuthUser user, CheckoutClients.Cart cart, CheckoutClients.Address address,
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
            return new Quote(cart.items(), subtotal, discount, fee, afterDiscount.add(fee), ev, address,
                    List.copyOf(warnings), canPlace);
        });
    }
}
