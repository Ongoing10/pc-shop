package com.pcshop.ordering.order;

import com.pcshop.contracts.AuthUser;
import com.pcshop.contracts.BulkErrors;
import com.pcshop.contracts.BusinessException;
import com.pcshop.contracts.ErrorCode;
import com.pcshop.contracts.PageResponse;
import com.pcshop.events.Events;
import com.pcshop.events.Topics;
import com.pcshop.ordering.checkout.CheckoutClients;
import com.pcshop.ordering.checkout.CheckoutService;
import com.pcshop.ordering.messaging.Outbox;
import com.pcshop.ordering.payment.PaymentLedger;
import com.pcshop.ordering.voucher.VoucherService;
import org.springframework.data.domain.Sort;
import org.springframework.data.r2dbc.core.R2dbcEntityTemplate;
import org.springframework.data.relational.core.query.Criteria;
import org.springframework.data.relational.core.query.Query;
import org.springframework.r2dbc.core.DatabaseClient;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

/**
 * Nghiệp vụ đơn hàng: tạo đơn, xem, lọc, đổi trạng thái, hủy, timeline.
 * Mọi lần đổi trạng thái đi qua {@link #transition}, nơi ghi lịch sử và event Saga (outbox) trong cùng transaction.
 */
@Service
public class OrderService {

    /**
     * Chuyển trạng thái nhân viên được làm tay. 7-CANCELLED và 8-RETURNED là trạng thái cuối.
     * PENDING = đang giữ hàng: Saga tự chuyển sang CONFIRMED (COD) / AWAITING_PAYMENT (online) hoặc CANCELLED (hết hàng),
     * nhân viên chỉ được hủy. AWAITING_PAYMENT → PAID: chưa có cổng thanh toán nên nhân viên xác nhận tay.
     */
    static final Map<Integer, Set<Integer>> TRANSITIONS = Map.of(
            Order.PENDING, Set.of(Order.CANCELLED),
            Order.AWAITING_PAYMENT, Set.of(Order.PAID, Order.CANCELLED),
            Order.PAID, Set.of(Order.CONFIRMED, Order.CANCELLED),
            Order.CONFIRMED, Set.of(Order.SHIPPING, Order.CANCELLED),
            Order.SHIPPING, Set.of(Order.COMPLETED, Order.RETURNED),
            Order.COMPLETED, Set.of(Order.RETURNED));

    /** Khách tự hủy được khi đơn chưa giao; đơn đã thanh toán thì phải liên hệ cửa hàng (cần hoàn tiền). */
    private static final Set<Integer> CUSTOMER_CANCELLABLE = Set.of(Order.PENDING, Order.AWAITING_PAYMENT, Order.CONFIRMED);

    private static final DateTimeFormatter CODE_DATE = DateTimeFormatter.BASIC_ISO_DATE;

    /** Chi tiết đơn kèm các dòng sản phẩm (snapshot lúc đặt). */
    public record OrderDetail(Order order, List<OrderItem> items) {
    }

    private final OrderRepository orders;
    private final OrderItemRepository items;
    private final OrderStatusHistoryRepository histories;
    private final R2dbcEntityTemplate template;
    private final DatabaseClient db;
    private final Outbox outbox;
    private final VoucherService vouchers;
    private final PaymentLedger ledger;

    public OrderService(OrderRepository orders, OrderItemRepository items, OrderStatusHistoryRepository histories,
                        R2dbcEntityTemplate template, DatabaseClient db, Outbox outbox, VoucherService vouchers,
                        PaymentLedger ledger) {
        this.orders = orders;
        this.items = items;
        this.histories = histories;
        this.template = template;
        this.db = db;
        this.outbox = outbox;
        this.vouchers = vouchers;
        this.ledger = ledger;
    }

    /**
     * Ghi đơn PENDING từ kết quả tính tiền: orders + order_items (snapshot) + lịch sử + lượt dùng voucher +
     * event order.created (outbox), tất cả trong MỘT transaction. Inventory nhận event để giữ hàng.
     */
    @Transactional
    public Mono<OrderDetail> create(AuthUser user, CheckoutService.Quote quote, int paymentMethod, String note,
                                    String requestId) {
        boolean voucherApplied = quote.voucher() != null && quote.voucher().valid();
        CheckoutClients.Address address = quote.address();
        return nextCode().flatMap(code -> {
            Order order = new Order();
            order.setCode(code);
            order.setUserId(user.id());
            order.setStatus(Order.PENDING);
            order.setPaymentMethod(paymentMethod);
            order.setPaymentStatus(Order.PAYMENT_STATUS_UNPAID);
            order.setSubtotalAmount(quote.subtotal());
            order.setDiscountAmount(quote.discountAmount());
            order.setShippingFee(quote.shippingFee());
            order.setTotalAmount(quote.totalAmount());
            order.setVoucherCode(voucherApplied ? quote.voucher().code() : null);
            order.setCustomerEmail(user.email());
            order.setReceiverName(address.receiverName());
            order.setReceiverPhone(address.receiverPhone());
            order.setShippingAddress(address.fullAddress());
            order.setNote(note == null || note.isBlank() ? null : note.trim());
            order.setPlacedAt(LocalDateTime.now());
            order.setRequestId(requestId);
            return orders.save(order);
        }).flatMap(order -> Flux.fromIterable(quote.items())
                .concatMap(line -> items.save(OrderItem.of(order, line)))
                .collectList()
                .flatMap(saved -> histories.save(OrderStatusHistory.of(order, null, Order.PENDING, "Đặt hàng", user.id()))
                        .then(voucherApplied
                                ? vouchers.recordUsage(order.getVoucherCode(), order.getId(), user.id(), quote.discountAmount())
                                : Mono.<Void>empty())
                        .then(outbox.add(Topics.ORDER_CREATED, order.getCode(), new Events.OrderCreated(
                                UUID.randomUUID(), order.getCode(), user.id(),
                                saved.stream().map(i -> new Events.OrderItem(i.getSku(), i.getQuantity(), i.getUnitPrice())).toList(),
                                order.getTotalAmount(), Instant.now())))
                        .then(statusChanged(order, null, Order.PENDING, "Đặt hàng"))
                        .thenReturn(new OrderDetail(order, saved))));
    }

    /** Đơn đã tạo bằng cùng Idempotency-Key của user (đặt trùng do bấm đúp / gửi lại request). */
    public Mono<OrderDetail> findByRequestId(UUID userId, String requestId) {
        return orders.findByUserIdAndRequestId(userId, requestId)
                .flatMap(order -> items.findAllByOrderIdOrderByIdAsc(order.getId()).collectList()
                        .map(list -> new OrderDetail(order, list)));
    }

    /** Cổng thanh toán báo thành công (PaymentService, trong transaction của nó): AWAITING_PAYMENT → PAID. */
    public Mono<Order> markPaid(Order order, String reason) {
        return transition(order, Order.PAID, reason, null);
    }

    /** Mã đơn DH + ngày đặt + 6 số từ sequence order_code_seq (không trùng kể cả khi đặt cùng lúc). */
    private Mono<String> nextCode() {
        return db.sql("SELECT nextval('order_code_seq')")
                .map(row -> row.get(0, Long.class))
                .one()
                .map(n -> "DH" + LocalDate.now().format(CODE_DATE) + String.format("%06d", n));
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
     * Khách tự hủy đơn của mình khi còn PENDING/AWAITING_PAYMENT/CONFIRMED và chưa thanh toán
     * (transition phát order.cancelled để inventory nhả hàng, trả lượt voucher).
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
                    if (!CUSTOMER_CANCELLABLE.contains(order.getStatus())
                            || Integer.valueOf(Order.PAYMENT_STATUS_PAID).equals(order.getPaymentStatus())) {
                        return Mono.error(new BusinessException(ErrorCode.BAD_REQUEST,
                                "Đơn đã thanh toán hoặc đang giao, không thể tự hủy. Vui lòng liên hệ cửa hàng"));
                    }
                    return transition(order, Order.CANCELLED, reason, user.id());
                });
    }

    /** Nhân viên đổi trạng thái đơn (permission order:update-status, kiểm tra ở controller). */
    @Transactional
    public Mono<Order> changeStatus(String code, int toStatus, String reason, AuthUser user) {
        return orders.findByCode(code)
                .switchIfEmpty(Mono.error(() -> BusinessException.notFound("đơn hàng", code)))
                .flatMap(order -> {
                    checkTransition(order, toStatus, reason);
                    return transition(order, toStatus, reason, user.id());
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
            return Flux.fromIterable(found).concatMap(order -> transition(order, toStatus, reason, user.id())).collectList();
        });
    }

    /** Package-private để unit test (OrderTransitionTest). */
    static void checkTransition(Order order, int toStatus, String reason) {
        if (!TRANSITIONS.getOrDefault(order.getStatus(), Set.of()).contains(toStatus)) {
            throw new BusinessException(ErrorCode.BAD_REQUEST,
                    "Không thể chuyển đơn từ trạng thái " + order.getStatus() + " sang " + toStatus);
        }
        if ((toStatus == Order.CANCELLED || toStatus == Order.RETURNED) && (reason == null || reason.isBlank())) {
            throw new BusinessException(ErrorCode.BAD_REQUEST, "Hủy/trả hàng phải có lý do");
        }
    }

    /**
     * Đổi trạng thái + ghi order_status_histories + event Saga, trong cùng transaction (của method gọi).
     * {@code actor} null = hệ thống (Saga, job hủy đơn quá hạn, cổng thanh toán).
     */
    Mono<Order> transition(Order order, int toStatus, String reason, UUID actor) {
        Integer from = order.getStatus();
        order.setStatus(toStatus);
        if (toStatus == Order.CANCELLED) {
            order.setCancelReason(reason);
        }
        if (toStatus == Order.PAID) {
            order.setPaymentStatus(Order.PAYMENT_STATUS_PAID);
        }
        if (toStatus == Order.COMPLETED) {
            order.setCompletedAt(LocalDateTime.now());
            if (Integer.valueOf(Order.PAYMENT_COD).equals(order.getPaymentMethod())) {
                order.setPaymentStatus(Order.PAYMENT_STATUS_PAID);   // COD: giao xong là đã thu tiền
            }
        }
        return orders.save(order)
                .flatMap(saved -> histories.save(OrderStatusHistory.of(saved, from, toStatus, reason, actor))
                        .then(sagaEvent(saved, from, toStatus, reason, actor))
                        .then(statusChanged(saved, from, toStatus, reason))
                        .thenReturn(saved));
    }

    /**
     * Tác dụng phụ của từng trạng thái đích:
     * <ul>
     *   <li>CANCELLED: trả lượt voucher, hủy các lần thanh toán đang chờ, đã thu tiền thì tạo yêu cầu hoàn tiền,
     *       inventory nhả hàng đang giữ (order.cancelled)</li>
     *   <li>PAID do nhân viên chuyển tay: ghi dòng payments (MANUAL-mã đơn) để sau này hoàn tiền được</li>
     *   <li>SHIPPING: inventory trừ hẳn hàng khỏi kho (order.shipped)</li>
     *   <li>COMPLETED: COD ghi dòng payments đã thu; catalog cộng sold_count (order.completed)</li>
     *   <li>RETURNED: đã thu tiền thì tạo yêu cầu hoàn tiền; trả sau khi hoàn tất thì catalog trừ sold_count (order.returned).
     *       Kho KHÔNG tự cộng lại: nhân viên kiểm hàng rồi điều chỉnh tồn kho.</li>
     * </ul>
     */
    private Mono<Void> sagaEvent(Order order, Integer from, int toStatus, String reason, UUID actor) {
        boolean paid = Integer.valueOf(Order.PAYMENT_STATUS_PAID).equals(order.getPaymentStatus());
        return switch (toStatus) {
            case Order.CANCELLED -> vouchers.releaseUsage(order.getId())
                    .then(ledger.expirePending(order))
                    .then(paid ? ledger.requestRefund(order, "Hủy đơn: " + reason, actor) : Mono.<Void>empty())
                    .then(publishCancelled(order, reason));
            // actor null = cổng thanh toán (đã có dòng payments); có actor = nhân viên xác nhận tay
            case Order.PAID -> actor != null ? ledger.recordManual(order) : Mono.empty();
            case Order.SHIPPING -> outbox.add(Topics.ORDER_SHIPPED, order.getCode(),
                    new Events.OrderShipped(UUID.randomUUID(), order.getCode(), Instant.now()));
            case Order.COMPLETED -> (Integer.valueOf(Order.PAYMENT_COD).equals(order.getPaymentMethod())
                    ? ledger.recordCod(order) : Mono.<Void>empty())
                    .then(eventItems(order).flatMap(list -> outbox.add(Topics.ORDER_COMPLETED, order.getCode(),
                            new Events.OrderCompleted(UUID.randomUUID(), order.getCode(), list, Instant.now()))));
            case Order.RETURNED -> (paid ? ledger.requestRefund(order, "Trả hàng: " + reason, actor) : Mono.<Void>empty())
                    .then(Integer.valueOf(Order.COMPLETED).equals(from)
                            ? eventItems(order).flatMap(list -> outbox.add(Topics.ORDER_RETURNED, order.getCode(),
                                    new Events.OrderReturned(UUID.randomUUID(), order.getCode(), list, Instant.now())))
                            : Mono.<Void>empty());
            default -> Mono.empty();
        };
    }

    /** Event cho notification-service (báo khách): mọi lần đổi trạng thái, kể cả lúc tạo đơn. */
    private Mono<Void> statusChanged(Order order, Integer from, int toStatus, String reason) {
        return outbox.add(Topics.ORDER_STATUS_CHANGED, order.getCode(), new Events.OrderStatusChanged(UUID.randomUUID(),
                order.getCode(), order.getUserId(), order.getCustomerEmail(), order.getReceiverName(), from, toStatus,
                reason, order.getTotalAmount(), Instant.now()));
    }

    /**
     * Mã đơn ĐÃ HOÀN TẤT gần nhất của user có chứa SKU (review-service đánh dấu "đã mua hàng"); rỗng nếu chưa mua.
     */
    public Mono<String> lastCompletedOrderWithSku(UUID userId, String sku) {
        return db.sql("""
                        SELECT o.code FROM orders o JOIN order_items i ON i.order_id = o.id
                        WHERE o.user_id = :userId AND i.sku = :sku AND o.status = :status
                        ORDER BY o.completed_at DESC NULLS LAST, o.id DESC LIMIT 1""")
                .bind("userId", userId)
                .bind("sku", sku)
                .bind("status", Order.COMPLETED)
                .map(row -> row.get("code", String.class))
                .one();
    }

    private Mono<List<Events.OrderItem>> eventItems(Order order) {
        return items.findAllByOrderIdOrderByIdAsc(order.getId())
                .map(i -> new Events.OrderItem(i.getSku(), i.getQuantity(), i.getUnitPrice()))
                .collectList();
    }

    /** Event order.cancelled; OrderSagaHandler cũng gọi lại khi hàng được giữ SAU lúc đơn đã hủy (bù trừ). */
    Mono<Void> publishCancelled(Order order, String reason) {
        return outbox.add(Topics.ORDER_CANCELLED, order.getCode(),
                new Events.OrderCancelled(UUID.randomUUID(), order.getCode(), reason, Instant.now()));
    }

    /** Đơn online chờ thanh toán đặt trước {@code placedBefore} (job hủy đơn quá hạn). */
    public Flux<Order> findUnpaidPlacedBefore(LocalDateTime placedBefore) {
        return template.select(Order.class)
                .matching(Query.query(Criteria.where("status").is(Order.AWAITING_PAYMENT)
                        .and("placedAt").lessThan(placedBefore)))
                .all();
    }

    /** Hệ thống hủy đơn chưa thanh toán quá hạn; đơn đã đổi trạng thái trong lúc đó thì bỏ qua. */
    @Transactional
    public Mono<Order> expireUnpaid(String code) {
        return orders.findByCode(code)
                .filter(order -> Integer.valueOf(Order.AWAITING_PAYMENT).equals(order.getStatus()))
                .flatMap(order -> transition(order, Order.CANCELLED, "Quá hạn thanh toán", null));
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

    /** Đơn của một khách, mới nhất trước, phân trang (lọc theo status nếu có). */
    public Mono<PageResponse<Order>> findByUser(UUID userId, Integer status, int page, int size) {
        int safeSize = Math.min(Math.max(size, 1), 100);
        int safePage = Math.max(page, 0);
        Criteria criteria = Criteria.where("userId").is(userId);
        if (status != null) {
            criteria = criteria.and("status").is(status);
        }
        Query query = Query.query(criteria);
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
