package com.pcshop.review;

import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.data.domain.Sort;
import org.springframework.data.mongodb.core.ReactiveMongoTemplate;
import org.springframework.data.mongodb.core.index.Index;
import org.springframework.data.mongodb.core.index.PartialIndexFilter;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.stereotype.Component;
import reactor.core.publisher.Mono;

import java.time.Duration;

/**
 * Tạo index khi khởi động. ensureIndex là idempotent: index đã có thì không làm gì.
 * Thay cho Mongock (chưa xác nhận hỗ trợ Spring Boot mới, xem plan mục 4 - Chiến lược migration).
 * Đổi cấu trúc dữ liệu (rename field...) thì viết thêm bước riêng ở đây, có kiểm tra đã chạy chưa.
 */
@Component
public class MongoIndexes implements ApplicationRunner {

    private final ReactiveMongoTemplate mongo;

    public MongoIndexes(ReactiveMongoTemplate mongo) {
        this.mongo = mongo;
    }

    private static final String UK_USER_PRODUCT_ORDER = "uk_reviews_user_product_order";

    @Override
    public void run(ApplicationArguments args) {
        dropLegacyUniqueIndex().block();
        Mono.when(
                mongo.indexOps("reviews").ensureIndex(new Index()
                        .on("product_id", Sort.Direction.ASC)
                        .on("status", Sort.Direction.ASC)
                        .on("created_at", Sort.Direction.DESC)
                        .named("idx_reviews_product_status_created")),
                // GET /reviews?sku= (trang sản phẩm dùng SKU trong URL)
                mongo.indexOps("reviews").ensureIndex(new Index()
                        .on("sku", Sort.Direction.ASC)
                        .on("status", Sort.Direction.ASC)
                        .on("created_at", Sort.Direction.DESC)
                        .named("idx_reviews_sku_status_created")),
                // Chỉ tính review còn hiệu lực (PENDING/APPROVED/REJECTED): người viết đã tự gỡ (4) thì viết lại được
                mongo.indexOps("reviews").ensureIndex(new Index()
                        .on("user_id", Sort.Direction.ASC)
                        .on("product_id", Sort.Direction.ASC)
                        .on("order_code", Sort.Direction.ASC)
                        .unique()
                        .partial(PartialIndexFilter.of(Criteria.where("status").lt(Review.DELETED_BY_USER)))
                        .named(UK_USER_PRODUCT_ORDER)),
                // Màn kiểm duyệt: lọc theo status, mới nhất trước
                mongo.indexOps("reviews").ensureIndex(new Index()
                        .on("status", Sort.Direction.ASC)
                        .on("created_at", Sort.Direction.DESC)
                        .named("idx_reviews_status_created")),
                mongo.indexOps("review_summaries").ensureIndex(new Index()
                        .on("product_id", Sort.Direction.ASC)
                        .unique()
                        .named("uk_review_summaries_product")),
                // Outbox (ReviewOutbox): đọc event chưa gửi theo thứ tự; event đã gửi tự xóa sau 7 ngày
                mongo.indexOps(ReviewOutbox.COLLECTION).ensureIndex(new Index()
                        .on("status", Sort.Direction.ASC)
                        .on("created_at", Sort.Direction.ASC)
                        .named("idx_outbox_status_created")),
                mongo.indexOps(ReviewOutbox.COLLECTION).ensureIndex(new Index()
                        .on("sent_at", Sort.Direction.ASC)
                        .expire(Duration.ofDays(7))
                        .named("ttl_outbox_sent"))
        ).block();   // chạy 1 lần lúc khởi động, chưa phục vụ request nên block được
    }

    /**
     * Bước chuyển 2026-10-27: bản đầu của uk_reviews_user_product_order không có partialFilter.
     * Cùng tên mà khác option thì ensureIndex báo IndexOptionsConflict, nên xóa bản cũ (nếu còn) để tạo lại.
     */
    private Mono<Void> dropLegacyUniqueIndex() {
        return mongo.indexOps("reviews").getIndexInfo()
                .filter(info -> UK_USER_PRODUCT_ORDER.equals(info.getName()) && info.getPartialFilterExpression() == null)
                .flatMap(info -> mongo.indexOps("reviews").dropIndex(UK_USER_PRODUCT_ORDER))
                .then();
    }
}
