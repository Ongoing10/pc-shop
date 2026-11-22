package com.pcshop.ai.rag;

import dev.langchain4j.model.input.PromptTemplate;
import dev.langchain4j.rag.DefaultRetrievalAugmentor;
import dev.langchain4j.rag.RetrievalAugmentor;
import dev.langchain4j.rag.content.injector.DefaultContentInjector;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;

import java.util.function.Supplier;

/** Gắn retriever vào AI service: mỗi câu hỏi được bổ sung các đoạn tri thức liên quan trước khi gửi LLM. */
@ApplicationScoped
public class ShopRetrievalAugmentor implements Supplier<RetrievalAugmentor> {

    /**
     * Dấu mốc ngăn câu hỏi của khách với phần tri thức chèn thêm. Bộ nhớ hội thoại cắt bỏ phần sau dấu mốc ở
     * các câu hỏi cũ (ChatSessionStore), để lượt sau không phải mang theo tri thức của mọi lượt trước.
     */
    public static final String CONTEXT_MARKER = "\n\n---\nThông tin tham khảo từ kho tri thức của cửa hàng";

    private static final PromptTemplate TEMPLATE = PromptTemplate.from("{{userMessage}}" + CONTEXT_MARKER
            + " (chỉ dùng nếu liên quan đến câu hỏi; không chứa giá và tồn kho):\n{{contents}}");

    @Inject
    HybridContentRetriever retriever;

    @Override
    public RetrievalAugmentor get() {
        return DefaultRetrievalAugmentor.builder()
                .contentRetriever(retriever)
                .contentInjector(DefaultContentInjector.builder().promptTemplate(TEMPLATE).build())
                .build();
    }
}
