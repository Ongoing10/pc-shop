package com.pcshop.ai.chat;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.pcshop.ai.assistant.ShopAssistant;
// import com.pcshop.ai.model.OllamaModels;
import com.pcshop.contracts.BusinessException;
import com.pcshop.contracts.ErrorCode;
import io.smallrye.mutiny.Multi;
import io.smallrye.mutiny.infrastructure.Infrastructure;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import org.eclipse.microprofile.config.inject.ConfigProperty;
import org.jboss.logging.Logger;

import java.util.UUID;
import java.util.regex.Pattern;

/**
 * Một lượt hỏi đáp: mở phiên (kiểm tra quyền sở hữu) → gọi trợ lý → ghi ai_request_logs và lịch sử phiên.
 * Mỗi phiên chỉ xử lý một câu hỏi một lúc (bộ nhớ hội thoại là tuần tự).
 */
@ApplicationScoped
public class ChatService {

    private static final Logger LOG = Logger.getLogger(ChatService.class);
    private static final Pattern SESSION_ID = Pattern.compile("[A-Za-z0-9-]{8,64}");
    private static final String BUSY = "Trợ lý AI đang bận hoặc chưa sẵn sàng, vui lòng thử lại sau.";

    public record ChatReply(String sessionId, String answer, Long requestId) {
    }

    /**
     * Phần tử của stream SSE, theo thứ tự: "session" (có sessionId) → không hoặc nhiều "status" (text: việc trợ lý
     * đang làm, vd tra giá) → "token" (text: câu trả lời) → "done" (có requestId để gửi phản hồi).
     * Lỗi giữa chừng: "error" (text là thông báo cho khách) thay cho token/done.
     * Hiện câu trả lời đến trong MỘT token (xem ShopAssistant#chat); client nên nối các token lại để sau này
     * đổi sang stream từng đoạn chữ không phải sửa.
     */
    public record ChatEvent(String type, String text, String sessionId, Long requestId) {

        static ChatEvent session(String sessionId) {
            return new ChatEvent("session", null, sessionId, null);
        }

        static ChatEvent status(String text) {
            return new ChatEvent("status", text, null, null);
        }

        static ChatEvent token(String text) {
            return new ChatEvent("token", text, null, null);
        }

        static ChatEvent done(String sessionId, Long requestId) {
            return new ChatEvent("done", null, sessionId, requestId);
        }

        static ChatEvent error(String message) {
            return new ChatEvent("error", message, null, null);
        }
    }

    @Inject
    ShopAssistant assistant;

    @Inject
    ChatSessionStore sessions;

    @Inject
    ChatTracker tracker;

    @Inject
    RequestLogRepository logs;

    @Inject
    ObjectMapper json;

    // Cũ (Ollama): chặn chat khi đang tải model
    // @Inject
    // OllamaModels models;

    // Cũ (Ollama): quarkus.langchain4j.ollama.chat-model.model-id
    @ConfigProperty(name = "quarkus.langchain4j.ai.gemini.chat-model.model-id", defaultValue = "unknown")
    String model;

    /** Trả lời một lần (chờ hết câu trả lời). Chạy trên worker thread. */
    public ChatReply chat(String requestedSessionId, String message, UUID userId) {
        // models.requireReady();
        String sessionId = start(requestedSessionId, message, userId);
        return answer(sessionId, message, userId, begin(sessionId));
    }

    /**
     * Trả lời dạng stream SSE. Kiểm tra phiên chạy ngay (lỗi thành HTTP 4xx như API thường);
     * lỗi của model giữa chừng thành sự kiện "error" vì header 200 đã gửi đi.
     * Khách đóng kết nối giữa chừng thì câu trả lời vẫn chạy xong và được lưu vào lịch sử phiên.
     */
    public Multi<ChatEvent> stream(String requestedSessionId, String message, UUID userId) {
        // models.requireReady();
        String sessionId = start(requestedSessionId, message, userId);
        ChatTracker.Trace trace = begin(sessionId);
        return Multi.createFrom().emitter(emitter -> {
            emitter.emit(ChatEvent.session(sessionId));
            trace.onProgress(text -> emitter.emit(ChatEvent.status(text)));
            Infrastructure.getDefaultWorkerPool().execute(() -> {
                try {
                    ChatReply reply = answer(sessionId, message, userId, trace);
                    emitter.emit(ChatEvent.token(reply.answer()));
                    emitter.emit(ChatEvent.done(sessionId, reply.requestId()));
                } catch (BusinessException e) {
                    emitter.emit(ChatEvent.error(e.getMessage()));
                } catch (RuntimeException e) {
                    LOG.errorf(e, "Chat stream lỗi (phiên %s)", sessionId);
                    emitter.emit(ChatEvent.error(BUSY));
                }
                emitter.complete();
            });
        });
    }

    public void feedback(String sessionId, long requestId, int value) {
        if (value != 1 && value != -1) {
            throw new BusinessException(ErrorCode.BAD_REQUEST, "Phản hồi chỉ nhận 1 (hữu ích) hoặc -1 (không hữu ích)");
        }
        try {
            if (!logs.setFeedback(requestId, sessionId, value)) {
                throw BusinessException.notFound("câu trả lời", requestId);
            }
        } catch (java.sql.SQLException e) {
            throw new IllegalStateException(e);
        }
    }

    /** Gọi trợ lý, ghi log + lịch sử; luôn giải phóng phiên khi xong. Lỗi model thành EXTERNAL_SERVICE_ERROR. */
    private ChatReply answer(String sessionId, String message, UUID userId, ChatTracker.Trace trace) {
        long started = System.currentTimeMillis();
        try {
            String answer = assistant.chat(sessionId, message);
            Long requestId = finish(sessionId, userId, message, answer, trace, started, null);
            return new ChatReply(sessionId, answer, requestId);
        } catch (BusinessException e) {
            throw e;
        } catch (RuntimeException e) {
            LOG.errorf(e, "Chat lỗi (phiên %s)", sessionId);
            finish(sessionId, userId, message, null, trace, started, e);
            throw new BusinessException(ErrorCode.EXTERNAL_SERVICE_ERROR, BUSY);
        } finally {
            tracker.end(sessionId);
        }
    }

    private String start(String requestedSessionId, String message, UUID userId) {
        String sessionId;
        if (requestedSessionId == null || requestedSessionId.isBlank()) {
            sessionId = UUID.randomUUID().toString();
        } else if (SESSION_ID.matcher(requestedSessionId).matches()) {
            sessionId = requestedSessionId;
        } else {
            throw new BusinessException(ErrorCode.BAD_REQUEST, "sessionId không hợp lệ");
        }
        sessions.open(sessionId, userId, message);
        return sessionId;
    }

    private ChatTracker.Trace begin(String sessionId) {
        ChatTracker.Trace trace = tracker.begin(sessionId);
        if (trace == null) {
            throw new BusinessException(ErrorCode.CONFLICT, "Câu hỏi trước trong cuộc trò chuyện này chưa trả lời xong");
        }
        return trace;
    }

    /**
     * Ghi log (và lịch sử nếu trả lời được). Lỗi khi ghi log không được làm hỏng câu trả lời đã có:
     * chỉ ghi lại cảnh báo, requestId = null (khách không gửi phản hồi được cho câu đó).
     */
    private Long finish(String sessionId, UUID userId, String question, String answer, ChatTracker.Trace trace,
                        long started, Throwable error) {
        Long requestId = null;
        try {
            requestId = logs.insert(new RequestLogRepository.NewLog(sessionId, userId, RequestLogRepository.TYPE_CHAT,
                    model, (int) (System.currentTimeMillis() - started), trace.chunkIds(),
                    json.writeValueAsString(trace.toolCalls()),
                    error == null ? RequestLogRepository.STATUS_SUCCESS : RequestLogRepository.STATUS_ERROR,
                    error == null ? null : String.valueOf(error.getMessage())));
        } catch (Exception e) {
            LOG.warnf(e, "Không ghi được ai_request_logs (phiên %s)", sessionId);
        }
        if (error == null) {
            try {
                sessions.appendTurn(sessionId, question, answer, requestId);
            } catch (RuntimeException e) {
                LOG.warnf(e, "Không lưu được lịch sử phiên %s", sessionId);
            }
        }
        return requestId;
    }
}
