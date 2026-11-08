package com.pcshop.notification;

import io.quarkus.mailer.Mail;
import io.quarkus.mailer.reactive.ReactiveMailer;
import io.quarkus.qute.Location;
import io.quarkus.qute.Template;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import org.eclipse.microprofile.config.inject.ConfigProperty;
import org.jboss.logging.Logger;

import java.time.Duration;
import java.time.Instant;
import java.util.Set;

/**
 * Email theo trạng thái đơn (mẫu templates/order-status.html), gửi BẤT ĐỒNG BỘ: consumer không chờ SMTP.
 * Chờ (await) trên thread của consumer gây deadlock ở lần gửi đầu (mail client khởi tạo trên cùng hàng đợi tuần tự
 * của Vert.x context đang bị consumer chiếm) và SMTP chậm sẽ chặn mọi thông báo sau.
 * Lỗi / quá pcshop.mail.send-timeout chỉ ghi log (thông báo trong ứng dụng đã lưu), không thử lại.
 */
@ApplicationScoped
public class NotificationMailer {

    private static final Logger LOG = Logger.getLogger(NotificationMailer.class);

    @Inject
    ReactiveMailer mailer;

    @Inject
    @Location("order-status.html")
    Template orderStatus;

    @ConfigProperty(name = "pcshop.mail.enabled", defaultValue = "true")
    boolean enabled;

    @ConfigProperty(name = "pcshop.mail.order-statuses", defaultValue = "2,3,4,5,6,7,8")
    Set<Integer> orderStatuses;

    @ConfigProperty(name = "pcshop.frontend-url", defaultValue = "http://localhost:3000")
    String frontendUrl;

    @ConfigProperty(name = "pcshop.mail.send-timeout", defaultValue = "PT20S")
    Duration sendTimeout;

    @ConfigProperty(name = "pcshop.mail.max-event-age", defaultValue = "PT1H")
    Duration maxEventAge;

    /** {@code occurredAt}: lúc xảy ra sự kiện; email trễ quá pcshop.mail.max-event-age thì bỏ (tin đã cũ). */
    public boolean shouldSend(String email, int status, Instant occurredAt) {
        boolean fresh = occurredAt == null || occurredAt.isAfter(Instant.now().minus(maxEventAge));
        boolean send = enabled && fresh && email != null && !email.isBlank() && orderStatuses.contains(status);
        if (!send) {
            LOG.debugf("Không gửi email (enabled=%s, fresh=%s, email=%s, status=%d)", enabled, fresh, email, status);
        }
        return send;
    }

    /** Email cho một lần đổi trạng thái đơn; title/content giống thông báo trong ứng dụng. */
    public void sendOrderStatus(String to, String customerName, String orderCode, String title, String content,
                                boolean needsPayment) {
        String html = orderStatus
                .data("name", customerName == null || customerName.isBlank() ? "Quý khách" : customerName)
                .data("title", title)
                .data("content", content)
                .data("orderCode", orderCode)
                .data("orderUrl", frontendUrl + "/orders/" + orderCode)
                .data("needsPayment", needsPayment)
                .render();
        mailer.send(Mail.withHtml(to, "[PC Shop] " + title + " - " + orderCode, html))
                .ifNoItem().after(sendTimeout).fail()
                .subscribe().with(
                        ok -> LOG.infof("Đã gửi email \"%s\" của đơn %s tới %s", title, orderCode, to),
                        e -> LOG.warnf("Không gửi được email \"%s\" của đơn %s: %s", title, orderCode, e.toString()));
    }
}
