package com.pcshop.ai.api;

import com.pcshop.ai.chat.ChatService;
import com.pcshop.ai.chat.ChatService.ChatEvent;
import com.pcshop.ai.chat.ChatService.ChatReply;
import com.pcshop.ai.chat.ChatSessionStore;
import com.pcshop.ai.chat.ChatSessionStore.SessionDetail;
import com.pcshop.ai.chat.ChatSessionStore.SessionSummary;
import com.pcshop.common.quarkus.CurrentUser;
import com.pcshop.contracts.AuthUser;
import com.pcshop.contracts.ResponseData;
import io.quarkus.security.Authenticated;
import io.smallrye.common.annotation.Blocking;
import io.smallrye.mutiny.Multi;
import jakarta.annotation.security.PermitAll;
import jakarta.inject.Inject;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import jakarta.ws.rs.DELETE;
import jakarta.ws.rs.DefaultValue;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.QueryParam;
import jakarta.ws.rs.core.MediaType;
import org.jboss.resteasy.reactive.RestStreamElementType;

import java.util.List;
import java.util.UUID;

/**
 * Chatbot tư vấn, mở cho cả khách vãng lai. Quản trị kho tri thức: {@link AdminKnowledgeResource}.
 * Mọi method đều chặn (gọi LLM, JDBC, Mongo) nên chạy trên worker thread (@Blocking).
 */
@Path("/api/v1/ai")
@Blocking
public class AiResource {

    public record ChatRequest(@Size(max = 64) String sessionId, @NotBlank @Size(max = 1000) String message) {
    }

    /** value: 1 hữu ích, -1 không hữu ích. requestId lấy từ câu trả lời (ChatReply / sự kiện "done"). */
    public record FeedbackRequest(@NotBlank String sessionId, @NotNull Long requestId, int value) {
    }

    @Inject
    ChatService chat;

    @Inject
    ChatSessionStore sessions;

    @Inject
    CurrentUser currentUser;

    /** Trả lời một lần. Không gửi sessionId thì tạo phiên mới (sessionId trả về để hỏi tiếp). */
    @POST
    @Path("/chat")
    @PermitAll
    public ResponseData<ChatReply> chat(@Valid ChatRequest request) {
        return ResponseData.success(chat.chat(request.sessionId(), request.message(), userId()));
    }

    /**
     * Trả lời dạng stream (SSE), mỗi sự kiện là một JSON {@link ChatEvent}: "session" → nhiều "token" → "done"
     * (hoặc "error"). Lỗi trước khi bắt đầu (sessionId sai, phiên của người khác...) vẫn trả envelope như API thường.
     */
    @POST
    @Path("/chat/stream")
    @PermitAll
    @Produces(MediaType.SERVER_SENT_EVENTS)
    @RestStreamElementType(MediaType.APPLICATION_JSON)
    public Multi<ChatEvent> stream(@Valid ChatRequest request) {
        return chat.stream(request.sessionId(), request.message(), userId());
    }

    /** Các cuộc trò chuyện gần đây của user đang đăng nhập (phiên vãng lai không có ở đây). */
    @GET
    @Path("/chat/sessions")
    @Authenticated
    public ResponseData<List<SessionSummary>> mySessions(@QueryParam("limit") @DefaultValue("20") int limit) {
        AuthUser user = currentUser.require();
        return ResponseData.success(sessions.listByUser(user.id(), Math.min(Math.max(limit, 1), 50)));
    }

    /** Lịch sử một phiên: phiên vãng lai thì ai có sessionId cũng xem được, phiên đã gán user thì chỉ chủ phiên. */
    @GET
    @Path("/chat/sessions/{sessionId}")
    @PermitAll
    public ResponseData<SessionDetail> session(@PathParam("sessionId") String sessionId) {
        return ResponseData.success(sessions.detail(sessionId, userId()));
    }

    @DELETE
    @Path("/chat/sessions/{sessionId}")
    @PermitAll
    public ResponseData<Void> deleteSession(@PathParam("sessionId") String sessionId) {
        sessions.delete(sessionId, userId());
        return ResponseData.success(null);
    }

    @POST
    @Path("/chat/feedback")
    @PermitAll
    public ResponseData<Void> feedback(@Valid FeedbackRequest request) {
        sessions.detail(request.sessionId(), userId());     // 404/403 nếu không có quyền với phiên này
        chat.feedback(request.sessionId(), request.requestId(), request.value());
        return ResponseData.success(null);
    }

    private UUID userId() {
        return currentUser.get().map(AuthUser::id).orElse(null);
    }
}
