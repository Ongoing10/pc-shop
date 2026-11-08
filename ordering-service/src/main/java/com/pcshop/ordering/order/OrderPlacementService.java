package com.pcshop.ordering.order;

import com.pcshop.contracts.AuthUser;
import com.pcshop.contracts.BusinessException;
import com.pcshop.contracts.ErrorCode;
import com.pcshop.ordering.checkout.CheckoutClients;
import com.pcshop.ordering.checkout.CheckoutService;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Mono;

import java.math.BigDecimal;

/**
 * POST /orders: tính lại tiền từ giỏ hiện tại (CheckoutService, giống /checkout/preview), kiểm tra, ghi đơn PENDING
 * (OrderService.create, một transaction kèm event order.created), rồi xóa giỏ. Hàng được giữ bất đồng bộ qua Saga:
 * client đọc lại GET /orders/{code} để thấy trạng thái tiếp theo.
 */
@Service
public class OrderPlacementService {

    /**
     * @param paymentMethod 1-COD, 2-VNPAY, 3-MOMO (online: chưa có cổng thanh toán, nhân viên xác nhận tay)
     * @param expectedTotal tổng tiền client đang hiển thị (từ preview); khác số tính lại thì từ chối để khách xem lại
     */
    public record PlaceOrderRequest(@NotNull Long addressId, @Size(max = 50) String voucherCode,
                                    @NotNull @Min(1) @Max(3) Integer paymentMethod, @Size(max = 500) String note,
                                    @PositiveOrZero BigDecimal expectedTotal) {
    }

    private final CheckoutService checkout;
    private final CheckoutClients clients;
    private final OrderService orders;

    public OrderPlacementService(CheckoutService checkout, CheckoutClients clients, OrderService orders) {
        this.checkout = checkout;
        this.clients = clients;
        this.orders = orders;
    }

    /**
     * @param requestId header Idempotency-Key (có thể null): cùng user gửi lại cùng key thì trả đơn đã tạo,
     *                  không tạo đơn thứ hai (kể cả hai request chạy song song: chỉ mục unique (user_id, request_id)).
     */
    public Mono<OrderService.OrderDetail> place(AuthUser user, String token, PlaceOrderRequest request, String requestId) {
        if (requestId != null && (requestId.isBlank() || requestId.length() > 64)) {
            return Mono.error(new BusinessException(ErrorCode.BAD_REQUEST, "Idempotency-Key phải có 1–64 ký tự"));
        }
        Mono<OrderService.OrderDetail> existing = requestId == null
                ? Mono.empty()
                : orders.findByRequestId(user.id(), requestId);
        return existing.switchIfEmpty(Mono.defer(() -> checkout.quote(user, token, request.voucherCode(), request.addressId())
                .flatMap(quote -> check(quote, request))
                .flatMap(quote -> orders.create(user, quote, request.paymentMethod(), request.note(), requestId))
                .onErrorResume(DuplicateKeyException.class, e -> requestId == null
                        ? Mono.error(e)
                        : orders.findByRequestId(user.id(), requestId))
                .flatMap(detail -> clients.clearCart(token).thenReturn(detail))));
    }

    private static Mono<CheckoutService.Quote> check(CheckoutService.Quote quote, PlaceOrderRequest request) {
        if (!quote.canPlaceOrder()) {
            return Mono.error(new BusinessException(ErrorCode.OUT_OF_STOCK,
                    "Có sản phẩm trong giỏ không mua được, vui lòng xem lại giỏ hàng", quote.warnings()));
        }
        boolean hasVoucher = request.voucherCode() != null && !request.voucherCode().isBlank();
        if (hasVoucher && (quote.voucher() == null || !quote.voucher().valid())) {
            String reason = quote.voucher() == null ? "Mã giảm giá không hợp lệ" : quote.voucher().reason();
            return Mono.error(new BusinessException(ErrorCode.VOUCHER_INVALID, reason));
        }
        if (request.expectedTotal() != null && request.expectedTotal().compareTo(quote.totalAmount()) != 0) {
            return Mono.error(new BusinessException(ErrorCode.CONFLICT,
                    "Tổng tiền đã thay đổi thành " + quote.totalAmount().stripTrailingZeros().toPlainString()
                            + "đ, vui lòng xem lại đơn hàng", quote));
        }
        return Mono.just(quote);
    }
}
