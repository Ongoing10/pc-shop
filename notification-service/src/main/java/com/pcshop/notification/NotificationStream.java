package com.pcshop.notification;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.quarkus.scheduler.Scheduled;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.sse.OutboundSseEvent;
import jakarta.ws.rs.sse.Sse;
import jakarta.ws.rs.sse.SseEventSink;
import org.jboss.logging.Logger;

import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Các kết nối SSE đang mở, theo user (một user có thể mở nhiều tab). Thông báo mới được đẩy tới mọi kết nối của
 * đúng user đó; 25 giây gửi một comment "ping" để proxy/gateway không cắt kết nối im lặng.
 * <p>
 * Giữ trong bộ nhớ: chỉ đúng khi chạy MỘT instance notification-service. Chạy nhiều instance thì phải phát lại qua
 * Redis pub/sub (hoặc cho mỗi instance một consumer group riêng) để instance nào giữ kết nối cũng nhận được.
 */
@ApplicationScoped
public class NotificationStream {

    private static final Logger LOG = Logger.getLogger(NotificationStream.class);

    private record Client(SseEventSink sink, Sse sse) {
    }

    private final Map<String, Set<Client>> clients = new ConcurrentHashMap<>();

    @Inject
    ObjectMapper mapper;

    /** Đăng ký kết nối mới và gửi ngay số thông báo chưa đọc (client đồng bộ badge khi vừa kết nối / kết nối lại). */
    public void open(String userId, SseEventSink sink, Sse sse, long unread) {
        Client client = new Client(sink, sse);
        clients.computeIfAbsent(userId, k -> ConcurrentHashMap.newKeySet()).add(client);
        send(userId, client, sse.newEventBuilder().name("unread-count")
                .mediaType(MediaType.APPLICATION_JSON_TYPE).data(String.class, "{\"count\":" + unread + "}").build());
        LOG.debugf("Mở stream thông báo cho %s (%d kết nối)", userId, clients.get(userId).size());
    }

    /** Đẩy một thông báo mới tới mọi kết nối của chủ thông báo. */
    public void publish(Notification n) {
        Set<Client> targets = clients.get(n.userId);
        if (targets == null || targets.isEmpty()) {
            return;
        }
        String json;
        try {
            json = mapper.writeValueAsString(n);
        } catch (JsonProcessingException e) {
            LOG.warnf("Không serialize được thông báo %s: %s", n.id, e.getMessage());
            return;
        }
        for (Client c : List.copyOf(targets)) {
            send(n.userId, c, c.sse().newEventBuilder().name("notification").id(n.id.toHexString())
                    .mediaType(MediaType.APPLICATION_JSON_TYPE).data(String.class, json).build());
        }
    }

    public int connectionCount() {
        return clients.values().stream().mapToInt(Set::size).sum();
    }

    @Scheduled(every = "25s", concurrentExecution = Scheduled.ConcurrentExecution.SKIP)
    void ping() {
        clients.forEach((userId, set) -> List.copyOf(set).forEach(c ->
                send(userId, c, c.sse().newEventBuilder().comment("ping").build())));
    }

    private void send(String userId, Client client, OutboundSseEvent event) {
        if (client.sink().isClosed()) {
            remove(userId, client);
            return;
        }
        // một sink có thể bị gọi đồng thời từ consumer Kafka và job ping
        synchronized (client) {
            client.sink().send(event).exceptionally(e -> {
                remove(userId, client);
                return null;
            });
        }
    }

    private void remove(String userId, Client client) {
        Set<Client> set = clients.get(userId);
        if (set != null && set.remove(client)) {
            try {
                client.sink().close();
            } catch (Exception ignored) {
                // đã đóng
            }
            if (set.isEmpty()) {
                clients.remove(userId, set);
            }
        }
    }
}
