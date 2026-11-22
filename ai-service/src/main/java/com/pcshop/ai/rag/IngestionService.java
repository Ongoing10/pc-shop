package com.pcshop.ai.rag;

import com.fasterxml.jackson.databind.ObjectMapper;
// import com.pcshop.ai.model.OllamaModels;
import dev.langchain4j.data.document.Document;
import dev.langchain4j.data.document.DocumentSplitter;
import dev.langchain4j.data.document.splitter.DocumentSplitters;
import dev.langchain4j.data.embedding.Embedding;
import dev.langchain4j.data.segment.TextSegment;
import dev.langchain4j.model.embedding.EmbeddingModel;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import org.eclipse.microprofile.config.inject.ConfigProperty;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.ArrayList;
import java.util.HexFormat;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Pipeline ingest (plan mục 5.1): chia chunk → embedding → lưu pgvector kèm metadata.
 * Embedding được tính TRƯỚC khi mở transaction (gọi model chậm, không giữ kết nối DB trong lúc chờ).
 */
@ApplicationScoped
public class IngestionService {

    public static final int SOURCE_PRODUCT = 1;
    public static final int SOURCE_GUIDE = 2;
    public static final int SOURCE_POLICY = 3;
    public static final int SOURCE_FAQ = 4;

    /** Tài liệu dài: khoảng 500 token ≈ 2000 ký tự, overlap khoảng 50 token ≈ 200 ký tự. */
    private static final DocumentSplitter SPLITTER = DocumentSplitters.recursive(2000, 200);

    @Inject
    EmbeddingModel embeddingModel;

    // Cũ (Ollama): chặn khi đang tải model
    // @Inject
    // OllamaModels models;

    @Inject
    ChunkRepository chunks;

    @Inject
    ObjectMapper json;

    // Cũ (Ollama): quarkus.langchain4j.ollama.embedding-model.model-id
    @ConfigProperty(name = "quarkus.langchain4j.ai.gemini.embedding-model.model-id", defaultValue = "unknown")
    String embeddingModelName;

    public record IngestResult(long documentId, int chunkCount, boolean skipped) {
    }

    /**
     * @param splitIntoChunks false với sản phẩm (mỗi sản phẩm là một chunk), true với tài liệu dài
     */
    public IngestResult ingest(String title, int sourceType, String sourceRef, String content,
                               Map<String, Object> metadata, boolean splitIntoChunks, UUID createdBy) throws Exception {
        // Có tên model trong hash: đổi model embedding (vd bge-m3 → Gemini) thì lần nạp sau tự embed lại, không giữ vector cũ
        String hash = sha256(embeddingModelName + "\n" + title + "\n" + content + "\n" + metadata);
        if (sourceRef != null && hash.equals(chunks.findContentHash(sourceType, sourceRef))) {
            return new IngestResult(-1, 0, true);                // nội dung không đổi, khỏi embed lại
        }

        // models.requireReady();
        List<TextSegment> segments = splitIntoChunks
                ? SPLITTER.split(Document.from(content))
                : List.of(TextSegment.from(content));
        List<Embedding> embeddings = embeddingModel.embedAll(segments).content();

        String metadataJson = json.writeValueAsString(metadata == null ? Map.of() : metadata);
        List<ChunkRepository.NewChunk> newChunks = new ArrayList<>();
        for (int i = 0; i < segments.size(); i++) {
            newChunks.add(new ChunkRepository.NewChunk(i, segments.get(i).text(), metadataJson,
                    embeddings.get(i).vector()));
        }
        long id = chunks.saveDocument(title, sourceType, sourceRef, hash, embeddingModelName, createdBy, newChunks);
        return new IngestResult(id, newChunks.size(), false);
    }

    private static String sha256(String s) throws Exception {
        byte[] digest = MessageDigest.getInstance("SHA-256").digest(s.getBytes(StandardCharsets.UTF_8));
        return HexFormat.of().formatHex(digest);
    }
}
