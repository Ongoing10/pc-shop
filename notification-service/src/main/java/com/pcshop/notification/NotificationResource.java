package com.pcshop.notification;

import com.pcshop.common.quarkus.CurrentUser;
import com.pcshop.contracts.BusinessException;
import com.pcshop.contracts.PageResponse;
import com.pcshop.contracts.ResponseData;
import io.quarkus.mongodb.panache.PanacheQuery;
import io.quarkus.panache.common.Page;
import io.quarkus.security.Authenticated;
import jakarta.inject.Inject;
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
 * Thông báo trong ứng dụng của chính người đang đăng nhập.
 * TODO (đợt 2): thêm quarkus-messaging-kafka (consume order.*, payment.*) để sinh thông báo,
 *       quarkus-mailer (email), quarkus-websockets-next (đẩy realtime).
 */
@Path("/api/v1/notifications")
@Authenticated
public class NotificationResource {

    @Inject
    NotificationRepository notifications;

    @Inject
    CurrentUser currentUser;

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
