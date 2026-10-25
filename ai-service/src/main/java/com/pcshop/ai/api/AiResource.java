package com.pcshop.ai.api;

import com.pcshop.ai.assistant.ShopAssistant;
import com.pcshop.ai.client.ShopClients.CatalogClient;
import com.pcshop.ai.client.ShopClients.ProductView;
import com.pcshop.ai.rag.ChunkRepository.ScoredChunk;
import com.pcshop.ai.rag.HybridContentRetriever;
import com.pcshop.ai.rag.IngestionService;
import com.pcshop.ai.rag.IngestionService.IngestResult;
import com.pcshop.common.quarkus.CurrentUser;
import com.pcshop.contracts.AuthUser;
import com.pcshop.contracts.ResponseData;
import io.quarkus.security.Authenticated;
import io.smallrye.common.annotation.Blocking;
import jakarta.annotation.security.PermitAll;
import jakarta.inject.Inject;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.ws.rs.DefaultValue;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.QueryParam;
import org.eclipse.microprofile.rest.client.inject.RestClient;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * API của ai-service. Mọi method đều chặn (gọi LLM, JDBC) nên chạy trên worker thread (@Blocking).
 */
@Path("/api/v1/ai")
@Blocking
public class AiResource {

    public record ChatRequest(String sessionId, @NotBlank String message) {
    }

    public record ChatResponse(String sessionId, String answer) {
    }

    public record KnowledgeRequest(@NotBlank String title, @Min(2) @Max(4) int sourceType, String sourceRef,
                                   @NotBlank String content, Map<String, Object> metadata) {
    }

    public record SyncResult(int total, int indexed, int skipped) {
    }

    @Inject
    ShopAssistant assistant;

    @Inject
    IngestionService ingestion;

    @Inject
    HybridContentRetriever retriever;

    @Inject
    CurrentUser currentUser;

    @Inject
    @RestClient
    CatalogClient catalog;

    /** Chatbot tư vấn, mở cho cả khách vãng lai. Không gửi sessionId thì tạo phiên mới. */
    @POST
    @Path("/chat")
    @PermitAll
    public ResponseData<ChatResponse> chat(@Valid ChatRequest request) {
        String sessionId = request.sessionId() == null || request.sessionId().isBlank()
                ? UUID.randomUUID().toString()
                : request.sessionId();
        return ResponseData.success(new ChatResponse(sessionId, assistant.chat(sessionId, request.message())));
    }

    /** Tìm kiếm ngữ nghĩa / xem retriever trả về gì (hữu ích khi chỉnh RAG). */
    @GET
    @Path("/search")
    @PermitAll
    public ResponseData<List<ScoredChunk>> search(@QueryParam("q") String q,
                                                  @QueryParam("category") String category,
                                                  @QueryParam("k") @DefaultValue("5") int k) throws Exception {
        return ResponseData.success(retriever.search(q, category, Math.min(Math.max(k, 1), 20)));
    }

    /** Admin thêm tài liệu tri thức (hướng dẫn build PC, chính sách, FAQ). Cần permission knowledge:write. */
    @POST
    @Path("/knowledge")
    @Authenticated
    public ResponseData<IngestResult> addKnowledge(@Valid KnowledgeRequest request) throws Exception {
        AuthUser user = currentUser.requirePermission("knowledge:write");
        return ResponseData.success(ingestion.ingest(request.title(), request.sourceType(), request.sourceRef(),
                request.content(), request.metadata(), true, user.id()));
    }

    /**
     * Đồng bộ toàn bộ sản phẩm ACTIVE từ catalog vào kho tri thức (mỗi sản phẩm một chunk).
     * Dùng để nạp dữ liệu ban đầu; về sau thay bằng consumer Kafka product.updated / product.hidden.
     * KHÔNG đưa giá vào nội dung: giá luôn lấy realtime qua tool getPrice.
     */
    @POST
    @Path("/knowledge/sync-products")
    @Authenticated
    public ResponseData<SyncResult> syncProducts() throws Exception {
        AuthUser user = currentUser.requirePermission("knowledge:write");
        List<ProductView> products = catalog.page(0, 100).data().content();
        int indexed = 0;
        int skipped = 0;
        for (ProductView p : products) {
            Map<String, Object> metadata = new HashMap<>();
            metadata.put("sku", p.sku());
            metadata.put("category", p.categoryCode());
            metadata.put("brand", p.brandCode());
            IngestResult r = ingestion.ingest(p.name(), IngestionService.SOURCE_PRODUCT, p.sku(),
                    productText(p), metadata, false, user.id());
            if (r.skipped()) {
                skipped++;
            } else {
                indexed++;
            }
        }
        return ResponseData.success(new SyncResult(products.size(), indexed, skipped));
    }

    private static String productText(ProductView p) {
        return """
                Sản phẩm: %s
                Mã SKU: %s
                Danh mục: %s. Thương hiệu: %s
                Mô tả: %s
                Thông số: %s
                Thông số tương thích: %s
                """.formatted(p.name(), p.sku(), p.categoryCode(), p.brandCode(),
                p.shortDescription() == null ? "" : p.shortDescription(), p.specs(), p.compat());
    }
}
