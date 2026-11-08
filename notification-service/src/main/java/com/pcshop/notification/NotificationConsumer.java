package com.pcshop.notification;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.mongodb.ErrorCategory;
import com.mongodb.MongoWriteException;
import com.pcshop.events.Events;
import io.smallrye.common.annotation.Blocking;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import org.bson.Document;
import org.eclipse.microprofile.reactive.messaging.Incoming;

import java.math.BigDecimal;
import java.text.NumberFormat;
import java.time.Instant;
import java.util.Locale;

/**
 * Sinh thông báo trong ứng dụng từ event: đơn đổi trạng thái (order.status-changed), cửa hàng trả lời review
 * (review.replied). source_event_id = eventId (unique) nên event giao lại không tạo thông báo trùng.
 * Thông báo MỚI được đẩy ngay tới trình duyệt đang mở (NotificationStream) và, với đơn hàng, gửi email (NotificationMailer).
 */
@ApplicationScoped
public class NotificationConsumer {

    @Inject
    NotificationRepository notifications;

    @Inject
    ObjectMapper mapper;

    @Inject
    NotificationStream stream;

    @Inject
    NotificationMailer mailer;

    @Incoming("order-status-changed")
    @Blocking
    public void onOrderStatusChanged(String json) throws JsonProcessingException {
        Events.OrderStatusChanged e = mapper.readValue(json, Events.OrderStatusChanged.class);
        String code = e.orderCode();
        String[] text = switch (e.toStatus()) {
            // 1 (đang giữ hàng) chỉ tồn tại vài giây, ngay sau đó có thông báo 2/4/7 nên bỏ qua
            case 2 -> new String[]{"Chờ thanh toán", "Đơn " + code + " đã được giữ hàng. Vui lòng thanh toán "
                    + money(e.totalAmount()) + " trong 15 phút."};
            case 3 -> new String[]{"Thanh toán thành công", "Đã nhận " + money(e.totalAmount()) + " cho đơn " + code + "."};
            case 4 -> new String[]{"Đơn hàng đã được xác nhận", "Đơn " + code + " đã được xác nhận và đang chuẩn bị hàng."};
            case 5 -> new String[]{"Đơn hàng đang được giao", "Đơn " + code + " đã bàn giao cho đơn vị vận chuyển."};
            case 6 -> new String[]{"Giao hàng thành công", "Đơn " + code + " đã giao xong. Hãy đánh giá sản phẩm bạn đã mua nhé!"};
            case 7 -> new String[]{"Đơn hàng đã bị hủy", "Đơn " + code + " đã bị hủy"
                    + (e.reason() == null || e.reason().isBlank() ? "." : ": " + e.reason())};
            case 8 -> new String[]{"Đơn hàng đã được trả", "Đơn " + code + " đã được ghi nhận trả hàng"
                    + (e.reason() == null || e.reason().isBlank() ? "." : ": " + e.reason())};
            default -> null;
        };
        if (text == null || e.userId() == null) {
            return;
        }
        boolean created = save(e.eventId().toString(), e.userId().toString(), e.toStatus() == 3 ? "PAYMENT" : "ORDER_STATUS",
                text[0], text[1], new Document("order_code", code).append("status", e.toStatus()), e.occurredAt());
        if (created && mailer.shouldSend(e.customerEmail(), e.toStatus(), e.occurredAt())) {
            mailer.sendOrderStatus(e.customerEmail(), e.customerName(), code, text[0], text[1], e.toStatus() == 2);
        }
    }

    @Incoming("review-replied")
    @Blocking
    public void onReviewReplied(String json) throws JsonProcessingException {
        Events.ReviewReplied e = mapper.readValue(json, Events.ReviewReplied.class);
        if (e.userId() == null) {
            return;
        }
        String reply = e.reply() == null ? "" : e.reply().length() > 200 ? e.reply().substring(0, 200) + "…" : e.reply();
        save(e.eventId().toString(), e.userId().toString(), "REVIEW_REPLY", "Cửa hàng đã trả lời đánh giá của bạn",
                reply, new Document("review_id", e.reviewId()).append("sku", e.sku()).append("product_id", e.productId()),
                e.occurredAt());
    }

    /** Lưu và đẩy realtime; false nếu thông báo của event này đã có (event giao lại). */
    private boolean save(String eventId, String userId, String type, String title, String content, Document data,
                         Instant at) {
        Notification n = new Notification();
        n.userId = userId;
        n.type = type;
        n.channel = "IN_APP";
        n.title = title;
        n.content = content;
        n.data = data;
        n.isRead = false;
        n.sendStatus = 2;
        n.sourceEventId = eventId;
        n.createdAt = at == null ? Instant.now() : at;
        try {
            notifications.persist(n);
        } catch (MongoWriteException ex) {
            if (ex.getError().getCategory() != ErrorCategory.DUPLICATE_KEY) {
                throw ex;
            }
            return false;
        }
        stream.publish(n);
        return true;
    }

    private static String money(BigDecimal amount) {
        if (amount == null) {
            return "";
        }
        return NumberFormat.getIntegerInstance(Locale.forLanguageTag("vi-VN")).format(amount) + "đ";
    }
}
