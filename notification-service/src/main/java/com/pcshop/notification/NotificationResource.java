package com.pcshop.notification;

import com.pcshop.common.quarkus.CurrentUser;
import com.pcshop.contracts.ResponseData;
import io.quarkus.security.Authenticated;
import jakarta.inject.Inject;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.Path;

import java.util.List;

/**
 * KHUNG notification.
 * TODO: thêm quarkus-messaging-kafka (consume order.*, payment.*), quarkus-mailer (email),
 *       quarkus-websockets-next (đẩy realtime), quarkus-mongodb-panache (collection notifications, TTL 90 ngày).
 */
@Path("/api/v1/notifications")
@Authenticated
public class NotificationResource {

    public record NotificationItem(String id, String title, String content, boolean read) {
    }

    @Inject
    CurrentUser currentUser;

    @GET
    public ResponseData<List<NotificationItem>> mine() {
        currentUser.require();
        return ResponseData.success(List.of());
    }
}
