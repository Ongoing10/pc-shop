package com.pcshop.ai.chat;

import com.mongodb.client.MongoClient;
import com.mongodb.client.MongoCollection;
import com.mongodb.client.model.Filters;
import com.mongodb.client.model.IndexOptions;
import com.mongodb.client.model.Indexes;
import com.mongodb.client.model.Sorts;
import com.mongodb.client.model.Updates;
import com.pcshop.ai.rag.ShopRetrievalAugmentor;
import com.pcshop.contracts.BusinessException;
import dev.langchain4j.data.message.ChatMessage;
import dev.langchain4j.data.message.ChatMessageDeserializer;
import dev.langchain4j.data.message.ChatMessageSerializer;
import dev.langchain4j.data.message.UserMessage;
import dev.langchain4j.store.memory.chat.ChatMemoryStore;
import io.quarkus.runtime.StartupEvent;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.enterprise.event.Observes;
import jakarta.inject.Inject;
import org.bson.Document;
import org.eclipse.microprofile.config.inject.ConfigProperty;

import java.time.Instant;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;
import java.util.Objects;
import java.util.UUID;
import java.util.concurrent.TimeUnit;

/**
 * Phiên chat ở Mongo (database "ai", collection chat_sessions), mỗi phiên một document:
 * <pre>{_id: sessionId, user_id, title, memory: "&lt;json của langchain4j&gt;", turns: [{role, text, request_id, at}],
 *  created_at, updated_at}</pre>
 * <ul>
 *   <li>{@code memory}: bộ nhớ đưa cho LLM (cửa sổ 12 message, có cả lời gọi tool), do langchain4j đọc/ghi qua
 *       {@link ChatMemoryStore}.</li>
 *   <li>{@code turns}: lịch sử sạch để hiển thị lại (câu hỏi gốc + câu trả lời), không có phần tri thức RAG chèn thêm.</li>
 * </ul>
 * Phiên không dùng trong 30 ngày tự xóa (TTL index trên updated_at). Phiên của khách vãng lai không có user_id:
 * ai biết sessionId (UUID ngẫu nhiên) thì dùng được; đăng nhập rồi hỏi tiếp thì phiên được gán cho user đó.
 */
@ApplicationScoped
public class ChatSessionStore implements ChatMemoryStore {

    public record Turn(String role, String text, Long requestId, Instant at) {
    }

    public record SessionSummary(String sessionId, String title, Instant createdAt, Instant updatedAt) {
    }

    public record SessionDetail(String sessionId, String title, Instant createdAt, Instant updatedAt, List<Turn> turns) {
    }

    private static final int TITLE_LENGTH = 60;
    private static final long TTL_DAYS = 30;

    @Inject
    MongoClient mongo;

    @ConfigProperty(name = "quarkus.mongodb.database")
    String database;

    private MongoCollection<Document> sessions() {
        return mongo.getDatabase(database).getCollection("chat_sessions");
    }

    void ensureIndexes(@Observes StartupEvent ignored) {
        sessions().createIndex(Indexes.ascending("updated_at"),
                new IndexOptions().name("ttl_updated_at").expireAfter(TTL_DAYS, TimeUnit.DAYS));
        sessions().createIndex(Indexes.compoundIndex(Indexes.ascending("user_id"), Indexes.descending("updated_at")),
                new IndexOptions().name("idx_user_updated"));
    }

    // ------------------------------------------------------------------ phiên

    /**
     * Mở phiên để hỏi tiếp, tạo mới nếu chưa có. Phiên đã gán cho user khác thì 403.
     * Phiên vãng lai được gán cho user đang đăng nhập (đăng nhập giữa chừng vẫn giữ được hội thoại).
     */
    public void open(String sessionId, UUID userId, String firstQuestion) {
        Document existing = sessions().find(Filters.eq("_id", sessionId)).first();
        Date now = new Date();
        if (existing == null) {
            sessions().insertOne(new Document("_id", sessionId)
                    .append("user_id", userId == null ? null : userId.toString())
                    .append("title", title(firstQuestion))
                    .append("memory", null)
                    .append("turns", List.of())
                    .append("created_at", now)
                    .append("updated_at", now));
            return;
        }
        String owner = existing.getString("user_id");
        if (owner != null && (userId == null || !owner.equals(userId.toString()))) {
            throw BusinessException.forbidden("Phiên chat này thuộc tài khoản khác");
        }
        if (owner == null && userId != null) {
            sessions().updateOne(Filters.eq("_id", sessionId), Updates.set("user_id", userId.toString()));
        }
    }

    /** Lưu một lượt hỏi đáp (bản sạch để hiển thị). */
    public void appendTurn(String sessionId, String question, String answer, Long requestId) {
        Date now = new Date();
        sessions().updateOne(Filters.eq("_id", sessionId), Updates.combine(
                Updates.pushEach("turns", List.of(
                        new Document("role", "user").append("text", question).append("at", now),
                        new Document("role", "assistant").append("text", answer)
                                .append("request_id", requestId).append("at", now))),
                Updates.set("updated_at", now)));
    }

    public List<SessionSummary> listByUser(UUID userId, int limit) {
        List<SessionSummary> result = new ArrayList<>();
        sessions().find(Filters.eq("user_id", userId.toString()))
                .projection(new Document("turns", 0).append("memory", 0))
                .sort(Sorts.descending("updated_at"))
                .limit(limit)
                .forEach(d -> result.add(new SessionSummary(d.getString("_id"), d.getString("title"),
                        instant(d, "created_at"), instant(d, "updated_at"))));
        return result;
    }

    /** Chi tiết phiên kèm lịch sử; kiểm tra quyền sở hữu như {@link #open}. */
    public SessionDetail detail(String sessionId, UUID userId) {
        Document d = requireAccessible(sessionId, userId);
        List<Turn> turns = new ArrayList<>();
        for (Document t : d.getList("turns", Document.class, List.of())) {
            turns.add(new Turn(t.getString("role"), t.getString("text"), t.getLong("request_id"), instant(t, "at")));
        }
        return new SessionDetail(sessionId, d.getString("title"), instant(d, "created_at"), instant(d, "updated_at"), turns);
    }

    /** Xóa thật phiên (khách bấm "xóa cuộc trò chuyện"). */
    public void delete(String sessionId, UUID userId) {
        requireAccessible(sessionId, userId);
        sessions().deleteOne(Filters.eq("_id", sessionId));
    }

    private Document requireAccessible(String sessionId, UUID userId) {
        Document d = sessions().find(Filters.eq("_id", sessionId)).first();
        if (d == null) {
            throw BusinessException.notFound("phiên chat", sessionId);
        }
        String owner = d.getString("user_id");
        if (owner != null && (userId == null || !owner.equals(userId.toString()))) {
            throw BusinessException.forbidden("Phiên chat này thuộc tài khoản khác");
        }
        return d;
    }

    // ------------------------------------------------------------------ ChatMemoryStore (langchain4j)

    @Override
    public List<ChatMessage> getMessages(Object memoryId) {
        Document d = sessions().find(Filters.eq("_id", memoryId.toString()))
                .projection(new Document("memory", 1)).first();
        String json = d == null ? null : d.getString("memory");
        return json == null ? new ArrayList<>() : new ArrayList<>(ChatMessageDeserializer.messagesFromJson(json));
    }

    /**
     * Ghi bộ nhớ. Câu hỏi của các lượt TRƯỚC được cắt phần tri thức RAG chèn thêm (chỉ giữ câu hỏi gốc);
     * câu hỏi cuối cùng giữ nguyên vì langchain4j đọc lại bộ nhớ để gửi cho LLM ngay trong lượt đang chạy.
     */
    @Override
    public void updateMessages(Object memoryId, List<ChatMessage> messages) {
        int lastUser = -1;
        for (int i = messages.size() - 1; i >= 0; i--) {
            if (messages.get(i) instanceof UserMessage) {
                lastUser = i;
                break;
            }
        }
        List<ChatMessage> compact = new ArrayList<>(messages.size());
        for (int i = 0; i < messages.size(); i++) {
            ChatMessage m = messages.get(i);
            compact.add(i != lastUser && m instanceof UserMessage u && u.hasSingleText()
                    ? UserMessage.from(stripContext(u.singleText()))
                    : m);
        }
        // upsert: phiên tạo bằng API cũ / test trực tiếp AI service vẫn ghi được
        sessions().updateOne(Filters.eq("_id", memoryId.toString()), Updates.combine(
                        Updates.set("memory", ChatMessageSerializer.messagesToJson(compact)),
                        Updates.set("updated_at", new Date()),
                        Updates.setOnInsert("created_at", new Date())),
                new com.mongodb.client.model.UpdateOptions().upsert(true));
    }

    @Override
    public void deleteMessages(Object memoryId) {
        sessions().updateOne(Filters.eq("_id", memoryId.toString()), Updates.set("memory", null));
    }

    static String stripContext(String text) {
        int at = text.indexOf(ShopRetrievalAugmentor.CONTEXT_MARKER);
        return at < 0 ? text : text.substring(0, at);
    }

    private static String title(String question) {
        String t = Objects.requireNonNullElse(question, "").strip().replaceAll("\\s+", " ");
        return t.length() <= TITLE_LENGTH ? t : t.substring(0, TITLE_LENGTH - 1) + "…";
    }

    private static Instant instant(Document d, String field) {
        Date date = d.getDate(field);
        return date == null ? null : date.toInstant();
    }
}
