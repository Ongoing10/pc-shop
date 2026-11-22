package com.pcshop.ai.chat;

import jakarta.enterprise.context.ApplicationScoped;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.function.Consumer;

/**
 * Ghi lại trong lúc trả lời một câu hỏi: chunk nào được truy xuất, tool nào được gọi (để lưu ai_request_logs),
 * và báo tiến trình ("đang tra giá...") cho stream SSE.
 * Gắn theo sessionId (= @MemoryId) chứ không theo request scope: retriever và tool có thể chạy trên thread khác
 * thread nhận request. Mỗi phiên chỉ có một câu hỏi đang xử lý (ChatService chặn gửi chồng).
 */
@ApplicationScoped
public class ChatTracker {

    public record ToolCall(String name, String arguments, String result) {
    }

    public static final class Trace {
        final List<Long> chunkIds = Collections.synchronizedList(new ArrayList<>());
        final List<ToolCall> toolCalls = Collections.synchronizedList(new ArrayList<>());
        volatile Consumer<String> progress = text -> {
        };

        public List<Long> chunkIds() {
            return List.copyOf(chunkIds);
        }

        public List<ToolCall> toolCalls() {
            return List.copyOf(toolCalls);
        }

        /** Nhận thông báo tiến trình (stream SSE đăng ký; trả lời một lần thì bỏ qua). */
        public void onProgress(Consumer<String> listener) {
            progress = listener;
        }
    }

    private final Map<String, Trace> active = new ConcurrentHashMap<>();

    /** Bắt đầu theo dõi một lượt; trả null nếu phiên này đang có câu hỏi khác chưa trả lời xong. */
    public Trace begin(String sessionId) {
        Trace trace = new Trace();
        return active.putIfAbsent(sessionId, trace) == null ? trace : null;
    }

    public void end(String sessionId) {
        active.remove(sessionId);
    }

    /** Báo việc trợ lý sắp làm, vd "Đang tra giá GPU-MSI-4070S-12G". */
    public void progress(Object sessionId, String text) {
        Trace trace = find(sessionId);
        if (trace != null) {
            trace.progress.accept(text);
        }
    }

    public void chunks(Object sessionId, List<Long> ids) {
        Trace trace = find(sessionId);
        if (trace != null) {
            trace.chunkIds.addAll(ids);
        }
    }

    public void tool(Object sessionId, String name, String arguments, String result) {
        Trace trace = find(sessionId);
        if (trace != null) {
            trace.toolCalls.add(new ToolCall(name, arguments, result));
        }
    }

    private Trace find(Object sessionId) {
        return sessionId == null ? null : active.get(sessionId.toString());
    }
}
