package com.pcshop.ordering.order;

import com.pcshop.common.webflux.security.CurrentUser;
import com.pcshop.contracts.PageResponse;
import com.pcshop.contracts.ResponseData;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import reactor.core.publisher.Mono;

import java.util.List;

/**
 * Đơn hàng phía khách. Quản trị: AdminOrderController.
 * Thanh toán online: PaymentController.
 */
@RestController
@RequestMapping("/api/v1/orders")
public class OrderController {

    public record CancelRequest(@NotBlank @Size(max = 255) String reason) {
    }

    private final OrderService service;
    private final OrderPlacementService placement;

    public OrderController(OrderService service, OrderPlacementService placement) {
        this.service = service;
        this.placement = placement;
    }

    /**
     * Đặt hàng từ giỏ hiện tại. Trả đơn PENDING (đang giữ hàng); vài giây sau Saga chuyển sang CONFIRMED (COD),
     * AWAITING_PAYMENT (online) hoặc CANCELLED (hết hàng). Giỏ được xóa sau khi đặt.
     */
    @PostMapping
    public Mono<ResponseData<OrderService.OrderDetail>> place(
            @RequestHeader(value = "Idempotency-Key", required = false) String idempotencyKey,
            @Valid @RequestBody OrderPlacementService.PlaceOrderRequest request) {
        return Mono.zip(CurrentUser.require(), CurrentUser.token())
                .flatMap(t -> placement.place(t.getT1(), t.getT2(), request, idempotencyKey))
                .map(ResponseData::success);
    }

    /** Đơn của chính người đang đăng nhập, mới nhất trước, phân trang; lọc theo status nếu có. */
    @GetMapping("/my")
    public Mono<ResponseData<PageResponse<Order>>> myOrders(@RequestParam(required = false) Integer status,
                                                            @RequestParam(defaultValue = "0") int page,
                                                            @RequestParam(defaultValue = "10") int size) {
        return CurrentUser.require()
                .flatMap(user -> service.findByUser(user.id(), status, page, size))
                .map(ResponseData::success);
    }

    public record PurchaseCheck(String sku, boolean purchased, String orderCode) {
    }

    /**
     * Người đang đăng nhập đã mua SKU này chưa (có đơn HOÀN TẤT chứa SKU). review-service gọi (chuyển tiếp token)
     * để đánh dấu "đã mua hàng"; frontend cũng dùng được để hiện nút "Viết đánh giá".
     */
    @GetMapping("/purchased")
    public Mono<ResponseData<PurchaseCheck>> purchased(@RequestParam String sku) {
        return CurrentUser.require()
                .flatMap(user -> service.lastCompletedOrderWithSku(user.id(), sku)
                        .map(code -> new PurchaseCheck(sku, true, code))
                        .defaultIfEmpty(new PurchaseCheck(sku, false, null)))
                .map(ResponseData::success);
    }

    /** Kiểm tra QUYỀN SỞ HỮU nằm trong code: khách chỉ xem đơn của mình, nhân viên xem mọi đơn. */
    @GetMapping("/{code}")
    public Mono<ResponseData<OrderService.OrderDetail>> byCode(@PathVariable String code) {
        return CurrentUser.require().flatMap(user -> service.detail(code, user)).map(ResponseData::success);
    }

    /** Lịch sử trạng thái của đơn (chủ đơn hoặc nhân viên). */
    @GetMapping("/{code}/timeline")
    public Mono<ResponseData<List<OrderStatusHistory>>> timeline(@PathVariable String code) {
        return CurrentUser.require()
                .flatMapMany(user -> service.timeline(code, user))
                .collectList()
                .map(ResponseData::success);
    }

    /** Khách tự hủy đơn khi PENDING/AWAITING_PAYMENT/CONFIRMED và chưa thanh toán. */
    @PostMapping("/{code}/cancel")
    public Mono<ResponseData<Order>> cancel(@PathVariable String code, @Valid @RequestBody CancelRequest request) {
        return CurrentUser.require()
                .flatMap(user -> service.cancelByOwner(code, user, request.reason()))
                .map(ResponseData::success);
    }
}
