package com.pcshop.ai.assistant;

import com.pcshop.ai.rag.ShopRetrievalAugmentor;
import dev.langchain4j.service.MemoryId;
import dev.langchain4j.service.SystemMessage;
import dev.langchain4j.service.UserMessage;
import io.quarkiverse.langchain4j.RegisterAiService;
import jakarta.enterprise.context.ApplicationScoped;

/**
 * Chatbot tư vấn linh kiện: RAG (ShopRetrievalAugmentor) + tool calling (ShopTools) + bộ nhớ hội thoại theo
 * sessionId (lưu ở Mongo qua ChatSessionStore). Quarkus tự sinh phần cài đặt của interface này.
 * Phải là @ApplicationScoped: mặc định AI service là @RequestScoped và XÓA bộ nhớ hội thoại khi request kết thúc.
 */
@RegisterAiService(retrievalAugmentor = ShopRetrievalAugmentor.class, tools = ShopTools.class)
@ApplicationScoped
public interface ShopAssistant {

    String SYSTEM = """
            Bạn là nhân viên tư vấn của cửa hàng linh kiện máy tính PC Shop. Trả lời bằng tiếng Việt, ngắn gọn, thân thiện.
            Quy tắc bắt buộc:
            1. Chỉ tư vấn dựa trên thông tin được cung cấp trong ngữ cảnh và kết quả của công cụ.
               Không đủ thông tin thì nói rõ là chưa có thông tin, KHÔNG tự bịa thông số.
            2. GIÁ và TỒN KHO: luôn gọi công cụ getPrice và checkStock, không bao giờ tự nêu giá hay số lượng.
            3. Khách hỏi theo ngân sách hoặc nhờ gợi ý sản phẩm: gọi findProducts để lấy sản phẩm đang bán kèm giá.
            4. Không tự khẳng định các linh kiện tương thích với nhau; dùng công cụ checkCompatibility
               rồi diễn giải đúng kết quả của nó.
            5. Khi gợi ý sản phẩm, luôn ghi kèm mã SKU. CHỈ dùng mã SKU xuất hiện trong ngữ cảnh hoặc kết quả công cụ,
               tuyệt đối không tự tạo mã SKU hay tên sản phẩm. Sản phẩm có trong ngữ cảnh là sản phẩm cửa hàng đang bán.
            6. Chỉ trả lời các câu hỏi liên quan đến linh kiện máy tính và mua sắm tại cửa hàng.
            """;

    /**
     * Chưa dùng bản stream token (Multi&lt;String&gt;): với quarkus-langchain4j-ollama 1.0.2 + Ollama 0.40, client stream
     * đọc dòng JSON tool_calls bị cắt giữa chừng (JsonEOFException ở Message["tool_calls"]) nên hỏng mỗi khi model gọi
     * tool. SSE của ChatService vì thế gửi tiến trình (status) trong lúc chạy bản này, rồi gửi câu trả lời ở cuối.
     */
    @SystemMessage(SYSTEM)
    String chat(@MemoryId String sessionId, @UserMessage String message);
}
