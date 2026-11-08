package com.pcshop.notification;

import io.quarkus.scheduler.Scheduled;
import jakarta.enterprise.context.ApplicationScoped;
import org.eclipse.microprofile.config.inject.ConfigProperty;

import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import java.util.Base64;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Vé mở stream SSE: EventSource của trình duyệt không gửi được header Authorization, và để access token trên URL thì
 * lộ vào log/lịch sử. Client lấy vé (có token) rồi mở GET /notifications/stream?ticket=..., vé dùng một lần, sống ngắn.
 * Giữ trong bộ nhớ (một instance), giống NotificationStream.
 */
@ApplicationScoped
public class StreamTickets {

    private record Ticket(String userId, Instant expiresAt) {
    }

    private static final SecureRandom RANDOM = new SecureRandom();

    private final Map<String, Ticket> tickets = new ConcurrentHashMap<>();

    @ConfigProperty(name = "pcshop.stream.ticket-ttl", defaultValue = "PT60S")
    Duration ttl;

    public String issue(String userId) {
        byte[] bytes = new byte[24];
        RANDOM.nextBytes(bytes);
        String value = Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
        tickets.put(value, new Ticket(userId, Instant.now().plus(ttl)));
        return value;
    }

    public Duration ttl() {
        return ttl;
    }

    /** userId của vé nếu còn hạn; vé bị xóa ngay (dùng một lần). */
    public Optional<String> redeem(String value) {
        if (value == null) {
            return Optional.empty();
        }
        Ticket t = tickets.remove(value);
        return t == null || t.expiresAt().isBefore(Instant.now()) ? Optional.empty() : Optional.of(t.userId());
    }

    @Scheduled(every = "5m")
    void purgeExpired() {
        Instant now = Instant.now();
        tickets.values().removeIf(t -> t.expiresAt().isBefore(now));
    }
}
