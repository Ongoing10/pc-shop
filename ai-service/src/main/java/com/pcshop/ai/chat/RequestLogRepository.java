package com.pcshop.ai.chat;

import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;

import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Types;
import java.util.List;
import java.util.UUID;

/**
 * Nhật ký mỗi lần gọi LLM (ai.ai_request_logs): độ trễ, chunk đã truy xuất, tool đã gọi, lỗi, phản hồi của khách.
 * Dùng để đánh giá RAG và giải thích "vì sao chatbot trả lời vậy" khi bảo vệ.
 */
@ApplicationScoped
public class RequestLogRepository {

    public static final int TYPE_CHAT = 1;
    public static final int STATUS_SUCCESS = 1;
    public static final int STATUS_ERROR = 2;

    public record NewLog(String sessionId, UUID userId, int requestType, String model, int latencyMs,
                         List<Long> chunkIds, String toolCallsJson, int status, String errorMessage) {
    }

    @Inject
    DataSource dataSource;

    public long insert(NewLog log) throws SQLException {
        try (Connection c = dataSource.getConnection();
             PreparedStatement ps = c.prepareStatement("""
                     INSERT INTO ai.ai_request_logs
                         (session_id, user_id, request_type, model, latency_ms, retrieved_chunk_ids, tool_calls,
                          status, error_message, created_at)
                     VALUES (?, ?, ?, ?, ?, ?, CAST(? AS jsonb), ?, ?, now())
                     RETURNING id""")) {
            ps.setString(1, log.sessionId());
            ps.setObject(2, log.userId(), Types.OTHER);
            ps.setInt(3, log.requestType());
            ps.setString(4, log.model());
            ps.setInt(5, log.latencyMs());
            ps.setArray(6, c.createArrayOf("bigint", log.chunkIds().toArray()));
            ps.setString(7, log.toolCallsJson());
            ps.setInt(8, log.status());
            ps.setString(9, log.errorMessage());
            try (ResultSet rs = ps.executeQuery()) {
                rs.next();
                return rs.getLong(1);
            }
        }
    }

    /**
     * Ghi phản hồi (1 hữu ích, -1 không hữu ích) cho câu trả lời thuộc đúng phiên đó.
     * Trả false nếu không có log khớp (sai id hoặc không thuộc phiên).
     */
    public boolean setFeedback(long id, String sessionId, int feedback) throws SQLException {
        try (Connection c = dataSource.getConnection();
             PreparedStatement ps = c.prepareStatement(
                     "UPDATE ai.ai_request_logs SET feedback = ? WHERE id = ? AND session_id = ?")) {
            ps.setInt(1, feedback);
            ps.setLong(2, id);
            ps.setString(3, sessionId);
            return ps.executeUpdate() == 1;
        }
    }
}
