package com.pcshop.notification;

import com.pcshop.common.quarkus.CurrentUser;
import com.pcshop.contracts.BusinessException;
import com.pcshop.contracts.ErrorCode;
import com.pcshop.contracts.PageResponse;
import com.pcshop.contracts.ResponseData;
import io.quarkus.mongodb.panache.PanacheQuery;
import io.quarkus.panache.common.Page;
import io.quarkus.security.Authenticated;
import jakarta.annotation.security.PermitAll;
import jakarta.inject.Inject;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.Context;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.sse.Sse;
import jakarta.ws.rs.sse.SseEventSink;
import jakarta.ws.rs.DefaultValue;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.PATCH;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;
import jakarta.ws.rs.QueryParam;
import org.bson.types.ObjectId;

import java.time.Instant;
import java.util.List;
import java.util.Map;

/**
 * Thông báo trong ứng dụng của chính người đang đăng nhập (sinh từ event: NotificationConsumer).
 * Đẩy realtime: GET /stream (SSE). Email: NotificationMailer.
 */
@Path("/api/v1/notifications")
@Authenticated
public class NotificationResource {

    @Inject
    NotificationRepository notifications;

    @Inject
    CurrentUser currentUser;

    @Inject
    NotificationStream stream;

    @Inject
    StreamTickets tickets;

    /**
     * Vé dùng một lần (sống pcshop.stream.ticket-ttl, mặc định 60 giây) để mở stream bằng EventSource của trình duyệt:
     * {@code new EventSource("/api/v1/notifications/stream?ticket=" + ticket)}.
     */
    @POST
    @Path("/stream-ticket")
    public ResponseData<Map<String, Object>> streamTicket() {
        return ResponseData.success(Map.of("ticket", tickets.issue(userId()), "expiresIn", tickets.ttl().toSeconds()));
    }

    /**
     * SSE: giữ kết nối, đẩy event "notification" (JSON Notification) khi có thông báo mới; lúc mở gửi
     * "unread-count" ({count}); 25 giây một comment ping. Xác thực bằng header Bearer (fetch-event-source...)
     * HOẶC ?ticket= (EventSource). Mất kết nối thì client mở lại (EventSource tự làm), lấy vé mới nếu dùng vé.
     */
    @GET
    @Path("/stream")
    @PermitAll
    @Produces(MediaType.SERVER_SENT_EVENTS)
    public void stream(@QueryParam("ticket") String ticket, @Context SseEventSink sink, @Context Sse sse) {
        String user = currentUser.get().map(u -> u.id().toString())
                .or(() -> tickets.redeem(ticket))
                .orElseThrow(() -> new BusinessException(ErrorCode.UNAUTHORIZED,
                        "Cần đăng nhập (header Bearer) hoặc vé stream còn hạn (?ticket=)"));
        stream.open(user, sink, sse, notifications.countUnread(user));
    }

    @GET
    public ResponseData<PageResponse<Notification>> mine(@QueryParam("page") @DefaultValue("0") int page,
                                                        @QueryParam("size") @DefaultValue("20") int size) {
        int safeSize = Math.min(Math.max(size, 1), 100);
        int safePage = Math.max(page, 0);
        PanacheQuery<Notification> query = notifications.byUser(userId());
        List<Notification> content = query.page(Page.of(safePage, safeSize)).list();
        return ResponseData.success(PageResponse.of(content, safePage, safeSize, query.count()));
    }

    @GET
    @Path("/unread-count")
    public ResponseData<Map<String, Long>> unreadCount() {
        return ResponseData.success(Map.of("count", notifications.countUnread(userId())));
    }

    @PATCH
    @Path("/{id}/read")
    public ResponseData<Notification> markRead(@PathParam("id") String id) {
        if (!ObjectId.isValid(id)) {
            throw BusinessException.notFound("thông báo", id);
        }
        Notification n = notifications.findOwned(new ObjectId(id), userId())
                .orElseThrow(() -> BusinessException.notFound("thông báo", id));
        if (!n.isRead) {
            n.isRead = true;
            n.readAt = Instant.now();
            notifications.update(n);
        }
        return ResponseData.success(n);
    }

    @PATCH
    @Path("/read-all")
    public ResponseData<Map<String, Long>> markAllRead() {
        return ResponseData.success(Map.of("updated", notifications.markAllRead(userId())));
    }

    private String userId() {
        return currentUser.require().id().toString();
    }
}
