package com.pcshop.ai.rag;

import com.pcshop.ai.chat.ChatTracker;
import com.pcshop.ai.model.OllamaModels;
import dev.langchain4j.data.segment.TextSegment;
import dev.langchain4j.model.embedding.EmbeddingModel;
import dev.langchain4j.rag.content.Content;
import dev.langchain4j.rag.content.retriever.ContentRetriever;
import dev.langchain4j.rag.query.Query;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import org.jboss.logging.Logger;

import java.util.List;

/**
 * ContentRetriever tự viết thay cho PgVectorEmbeddingStore có sẵn, để chạy truy vấn hybrid
 * (vector + full-text + lọc metadata) trên bảng do Flyway quản lý (plan mục 5.2).
 */
@ApplicationScoped
public class HybridContentRetriever implements ContentRetriever {

    private static final Logger LOG = Logger.getLogger(HybridContentRetriever.class);
    /** 4 đoạn × tối đa ~2000 ký tự: vừa ngữ cảnh mặc định 4096 token của Ollama cùng system prompt và bộ nhớ */
    private static final int TOP_K = 4;
    private static final double MIN_SCORE = 0.35;

    @Inject
    EmbeddingModel embeddingModel;

    @Inject
    OllamaModels models;

    @Inject
    ChunkRepository chunks;

    @Inject
    ChatTracker tracker;

    @Override
    public List<Content> retrieve(Query query) {
        try {
            if (query.metadata() != null) {
                tracker.progress(query.metadata().chatMemoryId(), "Đang tra cứu kho tri thức");
            }
            List<ChunkRepository.ScoredChunk> hits = search(query.text(), null, TOP_K).stream()
                    .filter(c -> c.score() >= MIN_SCORE)
                    .toList();
            if (query.metadata() != null) {
                tracker.chunks(query.metadata().chatMemoryId(),
                        hits.stream().map(ChunkRepository.ScoredChunk::chunkId).toList());
            }
            return hits.stream()
                    .map(c -> Content.from(TextSegment.from("[" + c.title() + "]\n" + c.content())))
                    .toList();
        } catch (Exception e) {
            // Truy xuất lỗi thì vẫn để LLM trả lời (sẽ nói không đủ thông tin), không làm hỏng cả cuộc chat
            LOG.error("Retrieval failed", e);
            return List.of();
        }
    }

    public List<ChunkRepository.ScoredChunk> search(String text, String category, int k) throws Exception {
        models.requireReady();
        float[] queryVector = embeddingModel.embed(text).content().vector();
        return chunks.search(queryVector, text, category, k);
    }
}
