package com.pcshop.ai.rag;

import dev.langchain4j.rag.DefaultRetrievalAugmentor;
import dev.langchain4j.rag.RetrievalAugmentor;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;

import java.util.function.Supplier;

/** Gắn retriever vào AI service: mỗi câu hỏi được bổ sung các đoạn tri thức liên quan trước khi gửi LLM. */
@ApplicationScoped
public class ShopRetrievalAugmentor implements Supplier<RetrievalAugmentor> {

    @Inject
    HybridContentRetriever retriever;

    @Override
    public RetrievalAugmentor get() {
        return DefaultRetrievalAugmentor.builder()
                .contentRetriever(retriever)
                .build();
    }
}
