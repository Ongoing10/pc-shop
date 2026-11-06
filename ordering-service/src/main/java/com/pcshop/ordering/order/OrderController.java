package com.pcshop.ordering.order;

import com.pcshop.common.webflux.security.CurrentUser;
import com.pcshop.contracts.ResponseData;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import reactor.core.publisher.Mono;

import java.util.List;

/**
 * Đơn hàng phía khách. Quản trị: AdminOrderController.
 * TODO (đợt 2): đặt hàng (ghi orders + order_items + outbox_events trong cùng transaction), Saga qua Kafka,
 *       thanh toán VNPay/MoMo.
 */
@RestController
@RequestMapping("/api/v1/orders")
public class OrderController {

    public record CancelRequest(@NotBlank @Size(max = 255) String reason) {
    }

    private final OrderRepository orders;
    private final OrderService service;

    public OrderController(OrderRepository orders, OrderService service) {
        this.orders = orders;
        this.service = service;
    }

    /** Đơn của chính người đang đăng nhập. */
    @GetMapping("/my")
    public Mono<ResponseData<List<Order>>> myOrders() {
        return CurrentUser.require()
                .flatMapMany(user -> orders.findAllByUserIdOrderByCreatedAtDesc(user.id()))
                .collectList()
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

    /** Khách tự hủy đơn (chỉ khi PENDING/AWAITING_PAYMENT). */
    @PostMapping("/{code}/cancel")
    public Mono<ResponseData<Order>> cancel(@PathVariable String code, @Valid @RequestBody CancelRequest request) {
        return CurrentUser.require()
                .flatMap(user -> service.cancelByOwner(code, user, request.reason()))
                .map(ResponseData::success);
    }
}
