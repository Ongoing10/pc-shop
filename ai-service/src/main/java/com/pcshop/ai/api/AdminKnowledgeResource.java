package com.pcshop.ai.api;

import com.pcshop.ai.rag.ChunkRepository;
import com.pcshop.ai.rag.ChunkRepository.ChunkView;
import com.pcshop.ai.rag.ChunkRepository.DocumentPage;
import com.pcshop.ai.rag.ChunkRepository.DocumentView;
import com.pcshop.ai.rag.ChunkRepository.ScoredChunk;
import com.pcshop.ai.rag.HybridContentRetriever;
import com.pcshop.ai.rag.IngestionService;
import com.pcshop.ai.rag.IngestionService.IngestResult;
import com.pcshop.ai.rag.ProductIndexer;
import com.pcshop.common.quarkus.CurrentUser;
import com.pcshop.contracts.AuthUser;
import com.pcshop.contracts.BusinessException;
import com.pcshop.contracts.ErrorCode;
import com.pcshop.contracts.PageResponse;
import com.pcshop.contracts.ResponseData;
import io.quarkus.security.Authenticated;
import io.smallrye.common.annotation.Blocking;
import jakarta.inject.Inject;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import jakarta.ws.rs.DELETE;
import jakarta.ws.rs.DefaultValue;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;
import jakarta.ws.rs.QueryParam;

import java.util.List;
import java.util.Map;

/**
 * Quản trị kho tri thức RAG (permission knowledge:write). Giá và tồn kho không nằm ở đây.
 * Sản phẩm tự vào/ra kho qua event product.updated / product.hidden; tài liệu khác (hướng dẫn, chính sách, FAQ)
 * thêm tay ở đây.
 */
@Path("/api/v1/admin/knowledge")
@Authenticated
@Blocking
public class AdminKnowledgeResource {

    private static final String PERMISSION = "knowledge:write";

    /** sourceType: 2 hướng dẫn, 3 chính sách, 4 FAQ (1 sản phẩm do hệ thống tự sinh). */
    public record KnowledgeRequest(@NotBlank @Size(max = 255) String title, @Min(2) @Max(4) int sourceType,
                                   @Size(max = 50) String sourceRef, @NotBlank @Size(max = 200_000) String content,
                                   Map<String, Object> metadata) {
    }

    public record DocumentDetail(DocumentView document, List<ChunkView> chunks) {
    }

    @Inject
    IngestionService ingestion;

    @Inject
    ProductIndexer products;

    @Inject
    ChunkRepository chunks;

    @Inject
    HybridContentRetriever retriever;

    @Inject
    CurrentUser currentUser;

    /** status bỏ trống = mọi trạng thái trừ ARCHIVED (5). q tìm theo tiêu đề hoặc nguồn tham chiếu. */
    @GET
    public ResponseData<PageResponse<DocumentView>> list(@QueryParam("sourceType") Integer sourceType,
                                                         @QueryParam("status") Integer status,
                                                         @QueryParam("q") String q,
                                                         @QueryParam("page") @DefaultValue("0") int page,
                                                         @QueryParam("size") @DefaultValue("20") int size)
            throws Exception {
        currentUser.requirePermission(PERMISSION);
        int safePage = Math.max(page, 0);
        int safeSize = Math.min(Math.max(size, 1), 100);
        DocumentPage result = chunks.listDocuments(sourceType, status, q, safePage, safeSize);
        return ResponseData.success(PageResponse.of(result.items(), safePage, safeSize, result.total()));
    }

    /** Chi tiết tài liệu kèm các chunk đã index (xem chunk được chia thế nào). */
    @GET
    @Path("/{id}")
    public ResponseData<DocumentDetail> detail(@PathParam("id") long id) throws Exception {
        currentUser.requirePermission(PERMISSION);
        DocumentView doc = chunks.findDocument(id).orElseThrow(() -> BusinessException.notFound("tài liệu", id));
        return ResponseData.success(new DocumentDetail(doc, chunks.listChunks(id)));
    }

    /**
     * Thêm tài liệu (chia chunk ~2000 ký tự, overlap 200, rồi embedding). Cùng sourceType + sourceRef với tài liệu
     * đã có thì index lại tài liệu đó (nội dung không đổi thì bỏ qua: skipped = true).
     */
    @POST
    public ResponseData<IngestResult> add(@Valid KnowledgeRequest request) throws Exception {
        AuthUser user = currentUser.requirePermission(PERMISSION);
        String sourceRef = request.sourceRef() == null || request.sourceRef().isBlank() ? null : request.sourceRef().trim();
        return ResponseData.success(ingestion.ingest(request.title().trim(), request.sourceType(), sourceRef,
                request.content(), request.metadata(), true, user.id()));
    }

    /** Gỡ tài liệu: xóa thật chunk, tài liệu chuyển ARCHIVED. Sản phẩm thì nên ẩn ở catalog (sẽ tự gỡ). */
    @DELETE
    @Path("/{id}")
    public ResponseData<Void> remove(@PathParam("id") long id) throws Exception {
        currentUser.requirePermission(PERMISSION);
        if (!chunks.archive(id)) {
            throw BusinessException.notFound("tài liệu đang dùng", id);
        }
        return ResponseData.success(null);
    }

    /**
     * Đồng bộ toàn bộ sản phẩm với catalog: index sản phẩm ACTIVE (bỏ qua cái không đổi), gỡ sản phẩm không còn bán.
     * Dùng khi nạp lần đầu hoặc khi nghi event bị lỡ (catalog gửi event không qua outbox).
     */
    @POST
    @Path("/sync-products")
    public ResponseData<ProductIndexer.SyncResult> syncProducts() throws Exception {
        AuthUser user = currentUser.requirePermission(PERMISSION);
        try {
            return ResponseData.success(products.syncAll(user.id()));
        } catch (jakarta.ws.rs.ProcessingException e) {
            throw new BusinessException(ErrorCode.EXTERNAL_SERVICE_ERROR, "Không gọi được catalog-service: " + e.getMessage());
        }
    }

    /** Xem retriever trả về gì cho một câu hỏi (50 ứng viên vector rồi xếp lại 0.7 vector + 0.3 full-text). */
    @GET
    @Path("/search")
    public ResponseData<List<ScoredChunk>> search(@QueryParam("q") String q,
                                                  @QueryParam("category") String category,
                                                  @QueryParam("k") @DefaultValue("5") int k) throws Exception {
        currentUser.requirePermission(PERMISSION);
        if (q == null || q.isBlank()) {
            throw new BusinessException(ErrorCode.BAD_REQUEST, "Nhập câu hỏi (q)");
        }
        String cat = category == null || category.isBlank() ? null : category;
        return ResponseData.success(retriever.search(q, cat, Math.min(Math.max(k, 1), 20)));
    }
}
