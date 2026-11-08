package com.pcshop.ordering.order;

import com.pcshop.contracts.BusinessException;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class OrderTransitionTest {

    private static Order order(int status) {
        Order o = new Order();
        o.setStatus(status);
        return o;
    }

    @Test
    void allowsNormalFlow() {
        assertThatCode(() -> OrderService.checkTransition(order(Order.PAID), Order.CONFIRMED, null))
                .doesNotThrowAnyException();
        assertThatCode(() -> OrderService.checkTransition(order(Order.CONFIRMED), Order.SHIPPING, null))
                .doesNotThrowAnyException();
        assertThatCode(() -> OrderService.checkTransition(order(Order.SHIPPING), Order.COMPLETED, null))
                .doesNotThrowAnyException();
        assertThatCode(() -> OrderService.checkTransition(order(Order.AWAITING_PAYMENT), Order.PAID, null))
                .doesNotThrowAnyException();
    }

    @Test
    void rejectsSkippingOrGoingBack() {
        assertThatThrownBy(() -> OrderService.checkTransition(order(Order.PENDING), Order.COMPLETED, null))
                .isInstanceOf(BusinessException.class);
        assertThatThrownBy(() -> OrderService.checkTransition(order(Order.SHIPPING), Order.CONFIRMED, null))
                .isInstanceOf(BusinessException.class);
        assertThatThrownBy(() -> OrderService.checkTransition(order(Order.SHIPPING), Order.CANCELLED, "x"))
                .isInstanceOf(BusinessException.class);
    }

    /** PENDING = Saga đang giữ hàng: nhân viên chỉ được hủy, không xác nhận tay. */
    @Test
    void pendingIsOnlyCancellableByStaff() {
        assertThatThrownBy(() -> OrderService.checkTransition(order(Order.PENDING), Order.CONFIRMED, null))
                .isInstanceOf(BusinessException.class);
        assertThatThrownBy(() -> OrderService.checkTransition(order(Order.PENDING), Order.AWAITING_PAYMENT, null))
                .isInstanceOf(BusinessException.class);
        assertThatCode(() -> OrderService.checkTransition(order(Order.PENDING), Order.CANCELLED, "Khách gọi hủy"))
                .doesNotThrowAnyException();
    }

    @Test
    void finalStatesCannotChange() {
        assertThatThrownBy(() -> OrderService.checkTransition(order(Order.CANCELLED), Order.PENDING, null))
                .isInstanceOf(BusinessException.class);
        assertThatThrownBy(() -> OrderService.checkTransition(order(Order.RETURNED), Order.COMPLETED, null))
                .isInstanceOf(BusinessException.class);
    }

    @Test
    void cancelAndReturnNeedReason() {
        assertThatThrownBy(() -> OrderService.checkTransition(order(Order.PENDING), Order.CANCELLED, " "))
                .isInstanceOf(BusinessException.class);
        assertThatThrownBy(() -> OrderService.checkTransition(order(Order.COMPLETED), Order.RETURNED, null))
                .isInstanceOf(BusinessException.class);
        assertThatCode(() -> OrderService.checkTransition(order(Order.COMPLETED), Order.RETURNED, "Lỗi phần cứng"))
                .doesNotThrowAnyException();
    }
}
