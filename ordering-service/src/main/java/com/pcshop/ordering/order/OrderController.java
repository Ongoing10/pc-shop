package com.pcshop.ordering.order;

import com.pcshop.common.webflux.security.CurrentUser;
import com.pcshop.contracts.BusinessException;
import com.pcshop.contracts.ResponseData;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import reactor.core.publisher.Mono;

import java.util.List;

/**
 * KHUNG: xem đơn hàng.
 * TODO: đặt hàng (ghi orders + order_items + outbox_events trong cùng transaction), Saga qua Kafka,
 *       đổi trạng thái (@PreAuthorize("hasAuthority('order:update-status')")), thanh toán VNPay/MoMo.
 */
@RestController
@RequestMapping("/api/v1/orders")
public class OrderController {

    private final OrderRepository orders;

    public OrderController(OrderRepository orders) {
        this.orders = orders;
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
    public Mono<ResponseData<Order>> byCode(@PathVariable String code) {
        return CurrentUser.require().flatMap(user -> orders.findByCode(code)
                .switchIfEmpty(Mono.error(() -> BusinessException.notFound("đơn hàng", code)))
                .flatMap(order -> order.getUserId().equals(user.id()) || user.isStaff()
                        ? Mono.just(order)
                        : Mono.<Order>error(BusinessException.forbidden("Đây không phải đơn của bạn"))))
                .map(ResponseData::success);
    }
}
