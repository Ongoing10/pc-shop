package com.pcshop.ai.rag;

import com.pcshop.ai.client.ShopClients.CatalogClient;
import com.pcshop.ai.client.ShopClients.ProductView;
import com.pcshop.contracts.PageResponse;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.ws.rs.WebApplicationException;
import org.eclipse.microprofile.rest.client.inject.RestClient;
import org.jboss.logging.Logger;

import java.util.HashMap;
import java.util.HashSet;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

/**
 * Đưa sản phẩm của catalog vào kho tri thức: mỗi sản phẩm ACTIVE là MỘT chunk (source_type PRODUCT, source_ref = SKU).
 * KHÔNG đưa giá/tồn kho vào nội dung: hai thứ này luôn lấy realtime qua tool.
 * Dùng chung cho API đồng bộ toàn bộ và consumer product.updated / product.hidden.
 */
@ApplicationScoped
public class ProductIndexer {

    private static final Logger LOG = Logger.getLogger(ProductIndexer.class);
    private static final int PAGE_SIZE = 100;

    public record SyncResult(int total, int indexed, int skipped, int removed) {
    }

    @Inject
    @RestClient
    CatalogClient catalog;

    @Inject
    IngestionService ingestion;

    @Inject
    ChunkRepository chunks;

    /**
     * Đồng bộ toàn bộ: index mọi sản phẩm ACTIVE (bỏ qua cái không đổi nội dung) và gỡ sản phẩm không còn ACTIVE.
     * Dùng để nạp ban đầu, hoặc bù khi catalog gửi event không thành (catalog không có outbox).
     */
    public SyncResult syncAll(UUID by) throws Exception {
        Set<String> activeSkus = new HashSet<>();
        int indexed = 0;
        int skipped = 0;
        int page = 0;
        PageResponse<ProductView> current;
        do {
            current = catalog.page(page++, PAGE_SIZE).data();
            for (ProductView p : current.content()) {
                activeSkus.add(p.sku());
                if (index(p, by).skipped()) {
                    skipped++;
                } else {
                    indexed++;
                }
            }
        } while (page < current.page().totalPages());

        int removed = 0;
        for (String sku : chunks.activeSourceRefs(IngestionService.SOURCE_PRODUCT)) {
            if (!activeSkus.contains(sku) && chunks.archiveBySource(IngestionService.SOURCE_PRODUCT, sku)) {
                removed++;
            }
        }
        return new SyncResult(activeSkus.size(), indexed, skipped, removed);
    }

    /**
     * Index lại một sản phẩm theo SKU (event product.updated). Sản phẩm không còn ACTIVE (API công khai trả 404)
     * thì gỡ khỏi kho tri thức, vì event có thể đến trễ sau khi sản phẩm đã bị ẩn.
     */
    public void reindex(String sku) throws Exception {
        Optional<ProductView> product = fetchActive(sku);
        if (product.isEmpty()) {
            remove(sku);
            return;
        }
        IngestionService.IngestResult r = index(product.get(), null);
        LOG.infof("Sản phẩm %s: %s", sku, r.skipped() ? "nội dung không đổi, bỏ qua" : "đã index lại");
    }

    /** Gỡ sản phẩm khỏi kho tri thức (event product.hidden). Gọi lại nhiều lần vẫn an toàn. */
    public void remove(String sku) throws Exception {
        if (chunks.archiveBySource(IngestionService.SOURCE_PRODUCT, sku)) {
            LOG.infof("Đã gỡ sản phẩm %s khỏi kho tri thức", sku);
        }
    }

    private Optional<ProductView> fetchActive(String sku) {
        try {
            return Optional.ofNullable(catalog.bySku(sku).data());
        } catch (WebApplicationException e) {
            if (e.getResponse() != null && e.getResponse().getStatus() == 404) {
                return Optional.empty();
            }
            throw e;
        }
    }

    private IngestionService.IngestResult index(ProductView p, UUID by) throws Exception {
        Map<String, Object> metadata = new HashMap<>();
        metadata.put("sku", p.sku());
        metadata.put("category", p.categoryCode());
        metadata.put("brand", p.brandCode());
        return ingestion.ingest(p.name(), IngestionService.SOURCE_PRODUCT, p.sku(), text(p), metadata, false, by);
    }

    static String text(ProductView p) {
        StringBuilder sb = new StringBuilder()
                .append("Sản phẩm: ").append(p.name()).append('\n')
                .append("Mã SKU: ").append(p.sku()).append('\n')
                .append("Danh mục: ").append(p.categoryCode()).append(". Thương hiệu: ").append(p.brandCode()).append('\n');
        appendIfPresent(sb, "Mô tả ngắn", p.shortDescription());
        appendIfPresent(sb, "Mô tả", p.description());
        if (p.specs() != null && !p.specs().isEmpty()) {
            sb.append("Thông số: ").append(p.specs()).append('\n');
        }
        if (p.compat() != null && !p.compat().isEmpty()) {
            sb.append("Thông số tương thích: ").append(p.compat()).append('\n');
        }
        if (p.tags() != null && !p.tags().isEmpty()) {
            sb.append("Phù hợp: ").append(String.join(", ", p.tags())).append('\n');
        }
        if (p.warrantyMonths() != null) {
            sb.append("Bảo hành: ").append(p.warrantyMonths()).append(" tháng\n");
        }
        return sb.toString();
    }

    private static void appendIfPresent(StringBuilder sb, String label, String value) {
        if (value != null && !value.isBlank()) {
            sb.append(label).append(": ").append(value.strip()).append('\n');
        }
    }
}
