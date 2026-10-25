package com.pcshop.ai.assistant;

import com.pcshop.ai.rag.ShopRetrievalAugmentor;
import dev.langchain4j.service.MemoryId;
import dev.langchain4j.service.SystemMessage;
import dev.langchain4j.service.UserMessage;
import io.quarkiverse.langchain4j.RegisterAiService;

/**
 * Chatbot tư vấn linh kiện: RAG (ShopRetrievalAugmentor) + tool calling (ShopTools) + bộ nhớ hội thoại theo sessionId.
 * Quarkus tự sinh phần cài đặt của interface này.
 *
 * TODO:
 *  - Trả lời dạng stream (Multi<String> + SSE) khi đã xác nhận model/provider hỗ trợ stream kèm tool calling.
 *  - Lưu bộ nhớ hội thoại vào MongoDB (chat_sessions/chat_messages) thay cho bộ nhớ trong RAM mặc định.
 */
@RegisterAiService(retrievalAugmentor = ShopRetrievalAugmentor.class, tools = ShopTools.class)
public interface ShopAssistant {

    @SystemMessage("""
            Bạn là nhân viên tư vấn của cửa hàng linh kiện máy tính PC Shop. Trả lời bằng tiếng Việt, ngắn gọn, thân thiện.
            Quy tắc bắt buộc:
            1. Chỉ tư vấn dựa trên thông tin được cung cấp trong ngữ cảnh và kết quả của công cụ.
               Không đủ thông tin thì nói rõ là chưa có thông tin, KHÔNG tự bịa thông số.
            2. GIÁ và TỒN KHO: luôn gọi công cụ getPrice và checkStock, không bao giờ tự nêu giá hay số lượng.
            3. Không tự khẳng định các linh kiện tương thích với nhau; dùng công cụ checkCompatibility.
            4. Khi gợi ý sản phẩm, luôn ghi kèm mã SKU.
            5. Chỉ trả lời các câu hỏi liên quan đến linh kiện máy tính và mua sắm tại cửa hàng.
            """)
    String chat(@MemoryId String sessionId, @UserMessage String message);
}
