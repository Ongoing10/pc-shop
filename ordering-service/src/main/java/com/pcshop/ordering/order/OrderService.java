package com.pcshop.ordering.order;

import com.pcshop.contracts.AuthUser;
import com.pcshop.contracts.BulkErrors;
import com.pcshop.contracts.BusinessException;
import com.pcshop.contracts.ErrorCode;
import com.pcshop.contracts.PageResponse;
import org.springframework.data.domain.Sort;
import org.springframework.data.r2dbc.core.R2dbcEntityTemplate;
import org.springframework.data.relational.core.query.Criteria;
import org.springframework.data.relational.core.query.Query;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Set;

/** Nghiệp vụ đơn hàng không cần Kafka: xem, lọc, đổi trạng thái, hủy, timeline. Tạo đơn + Saga ở đợt 2. */
@Service
public class OrderService {

    /**
     * Chuyển trạng thái hợp lệ. 7-CANCELLED và 8-RETURNED là trạng thái cuối.
     * Thanh toán online: AWAITING_PAYMENT → PAID do callback cổng thanh toán (đợt 2), nhân viên vẫn chỉnh tay được.
     */
    static final Map<Integer, Set<Integer>> TRANSITIONS = Map.of(
            Order.PENDING, Set.of(Order.AWAITING_PAYMENT, Order.CONFIRMED, Order.CANCELLED),
            Order.AWAITING_PAYMENT, Set.of(Order.PAID, Order.CANCELLED),
            Order.PAID, Set.of(Order.CONFIRMED, Order.CANCELLED),
            Order.CONFIRMED, Set.of(Order.SHIPPING, Order.CANCELLED),
            Order.SHIPPING, Set.of(Order.COMPLETED, Order.RETURNED),
            Order.COMPLETED, Set.of(Order.RETURNED));

    /** Khách chỉ tự hủy được khi đơn chưa được xác nhận. */
    private static final Set<Integer> CUSTOMER_CANCELLABLE = Set.of(Order.PENDING, Order.AWAITING_PAYMENT);

    /** Chi tiết đơn kèm các dòng sản phẩm (snapshot lúc đặt). */
    public record OrderDetail(Order order, List<OrderItem> items) {
    }

    private final OrderRepository orders;
    private final OrderItemRepository items;
    private final OrderStatusHistoryRepository histories;
    private final R2dbcEntityTemplate template;

    public OrderService(OrderRepository orders, OrderItemRepository items, OrderStatusHistoryRepository histories,
                        R2dbcEntityTemplate template) {
        this.orders = orders;
        this.items = items;
        this.histories = histories;
        this.template = template;
    }

    /** Đơn theo mã, kiểm tra QUYỀN SỞ HỮU: khách chỉ xem đơn của mình, nhân viên xem mọi đơn. */
    public Mono<Order> findVisible(String code, AuthUser user) {
        return orders.findByCode(code)
                .switchIfEmpty(Mono.error(() -> BusinessException.notFound("đơn hàng", code)))
                .flatMap(order -> order.getUserId().equals(user.id()) || user.isStaff()
                        ? Mono.just(order)
                        : Mono.<Order>error(BusinessException.forbidden("Đây không phải đơn của bạn")));
    }

    /** Đơn + các dòng sản phẩm, cùng kiểm tra quyền sở hữu như {@link #findVisible}. */
    public Mono<OrderDetail> detail(String code, AuthUser user) {
        return findVisible(code, user).flatMap(order -> items.findAllByOrderIdOrderByIdAsc(order.getId())
                .collectList()
                .map(list -> new OrderDetail(order, list)));
    }

    public Flux<OrderStatusHistory> timeline(String code, AuthUser user) {
        return findVisible(code, user).flatMapMany(o -> histories.findAllByOrderIdOrderByCreatedAtAscIdAsc(o.getId()));
    }

    /**
     * Khách tự hủy đơn của mình khi còn PENDING/AWAITING_PAYMENT.
     * TODO (đợt 2): bắn event order.cancelled (outbox) để inventory nhả hàng đang giữ, hoàn tiền nếu đã trả.
     */
    @Transactional
    public Mono<Order> cancelByOwner(String code, AuthUser user, String reason) {
        return orders.findByCode(code)
                .switchIfEmpty(Mono.error(() -> BusinessException.notFound("đơn hàng", code)))
                .flatMap(order -> {
                    if (!order.getUserId().equals(user.id())) {
                        return Mono.error(BusinessException.forbidden("Đây không phải đơn của bạn"));
                    }
                    if (Integer.valueOf(Order.CANCELLED).equals(order.getStatus())) {
                        return Mono.error(new BusinessException(ErrorCode.BAD_REQUEST, "Đơn đã bị hủy trước đó"));
                    }
                    if (!CUSTOMER_CANCELLABLE.contains(order.getStatus())) {
                        return Mono.error(new BusinessException(ErrorCode.BAD_REQUEST,
                                "Đơn đã được xác nhận, không thể tự hủy. Vui lòng liên hệ cửa hàng"));
                    }
                    return transition(order, Order.CANCELLED, reason, user);
                });
    }

    /** Nhân viên đổi trạng thái đơn (permission order:update-status, kiểm tra ở controller). */
    @Transactional
    public Mono<Order> changeStatus(String code, int toStatus, String reason, AuthUser user) {
        return orders.findByCode(code)
                .switchIfEmpty(Mono.error(() -> BusinessException.notFound("đơn hàng", code)))
                .flatMap(order -> {
                    checkTransition(order, toStatus, reason);
                    // TODO (đợt 2): CANCELLED → event order.cancelled; COMPLETED → event order.completed (sold_count)
                    return transition(order, toStatus, reason, user);
                });
    }

    /**
     * Đổi trạng thái nhiều đơn cùng lúc (vd xác nhận/giao hàng loạt), "tất cả hoặc không":
     * một đơn không tồn tại hoặc không chuyển được thì không đổi đơn nào; ghi lịch sử trong cùng transaction.
     */
    @Transactional
    public Mono<List<Order>> changeStatusAll(List<String> codes, int toStatus, String reason, AuthUser user) {
        BulkErrors errors = BulkErrors.check(codes);
        return orders.findAllByCodeIn(codes).collectList().flatMap(found -> {
            codes.stream().filter(code -> found.stream().noneMatch(o -> o.getCode().equals(code)))
                    .forEach(code -> errors.add(code, "Không tìm thấy đơn hàng"));
            found.forEach(order -> errors.tryRun(order.getCode(), () -> checkTransition(order, toStatus, reason)));
            errors.throwIfAny();
            found.sort(Comparator.comparing(o -> codes.indexOf(o.getCode())));
            return Flux.fromIterable(found).concatMap(order -> transition(order, toStatus, reason, user)).collectList();
        });
    }

    private static void checkTransition(Order order, int toStatus, String reason) {
        if (!TRANSITIONS.getOrDefault(order.getStatus(), Set.of()).contains(toStatus)) {
            throw new BusinessException(ErrorCode.BAD_REQUEST,
                    "Không thể chuyển đơn từ trạng thái " + order.getStatus() + " sang " + toStatus);
        }
        if ((toStatus == Order.CANCELLED || toStatus == Order.RETURNED) && (reason == null || reason.isBlank())) {
            throw new BusinessException(ErrorCode.BAD_REQUEST, "Hủy/trả hàng phải có lý do");
        }
    }

    /** Đổi trạng thái + ghi order_status_histories trong cùng transaction (của method gọi). */
    private Mono<Order> transition(Order order, int toStatus, String reason, AuthUser user) {
        Integer from = order.getStatus();
        order.setStatus(toStatus);
        if (toStatus == Order.CANCELLED) {
            order.setCancelReason(reason);
        }
        if (toStatus == Order.COMPLETED) {
            order.setCompletedAt(LocalDateTime.now());
            if (Integer.valueOf(Order.PAYMENT_COD).equals(order.getPaymentMethod())) {
                order.setPaymentStatus(Order.PAYMENT_STATUS_PAID);   // COD: giao xong là đã thu tiền
            }
        }
        return orders.save(order)
                .flatMap(saved -> histories.save(OrderStatusHistory.of(saved, from, toStatus, reason, user.id()))
                        .thenReturn(saved));
    }

    /**
     * Lọc đơn cho trang admin. q tìm theo mã đơn, SĐT hoặc tên người nhận; from/to theo ngày tạo (gồm cả ngày to).
     */
    public Mono<PageResponse<Order>> search(Integer status, LocalDate from, LocalDate to, String q, int page, int size) {
        int safeSize = Math.min(Math.max(size, 1), 100);
        int safePage = Math.max(page, 0);
        Query query = Query.query(adminCriteria(status, from, to, q));
        Mono<List<Order>> content = template.select(Order.class)
                .matching(query.sort(ADMIN_SORT).limit(safeSize).offset((long) safePage * safeSize))
                .all()
                .collectList();
        Mono<Long> total = template.count(query, Order.class);
        return Mono.zip(content, total).map(t -> PageResponse.of(t.getT1(), safePage, safeSize, t.getT2()));
    }

    /** Số đơn khớp bộ lọc của trang admin (export kiểm tra giới hạn trước khi đọc). */
    public Mono<Long> countForAdmin(Integer status, LocalDate from, LocalDate to, String q) {
        return template.count(Query.query(adminCriteria(status, from, to, q)), Order.class);
    }

    /** Đơn khớp bộ lọc của trang admin, cùng thứ tự với danh sách, tối đa {@code limit} đơn. */
    public Flux<Order> findForAdmin(Integer status, LocalDate from, LocalDate to, String q, int limit) {
        return template.select(Order.class)
                .matching(Query.query(adminCriteria(status, from, to, q)).sort(ADMIN_SORT).limit(limit))
                .all();
    }

    private static final Sort ADMIN_SORT = Sort.by(Sort.Order.desc("createdAt"), Sort.Order.desc("id"));

    private static Criteria adminCriteria(Integer status, LocalDate from, LocalDate to, String q) {
        Criteria criteria = Criteria.empty();
        if (status != null) {
            criteria = criteria.and("status").is(status);
        }
        if (from != null) {
            criteria = criteria.and("createdAt").greaterThanOrEquals(from.atStartOfDay());
        }
        if (to != null) {
            criteria = criteria.and("createdAt").lessThan(to.plusDays(1).atStartOfDay());
        }
        if (q != null && !q.isBlank()) {
            String pattern = "%" + q.trim().replace("%", "\\%").replace("_", "\\_") + "%";
            criteria = criteria.and(Criteria.where("code").like(pattern).ignoreCase(true)
                    .or("receiverPhone").like(pattern)
                    .or(Criteria.where("receiverName").like(pattern).ignoreCase(true)));
        }
        return criteria;
    }
}
