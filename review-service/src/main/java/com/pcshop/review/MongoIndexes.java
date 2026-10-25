package com.pcshop.review;

import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.data.domain.Sort;
import org.springframework.data.mongodb.core.ReactiveMongoTemplate;
import org.springframework.data.mongodb.core.index.Index;
import org.springframework.stereotype.Component;
import reactor.core.publisher.Mono;

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

    @Override
    public void run(ApplicationArguments args) {
        Mono.when(
                mongo.indexOps("reviews").ensureIndex(new Index()
                        .on("product_id", Sort.Direction.ASC)
                        .on("status", Sort.Direction.ASC)
                        .on("created_at", Sort.Direction.DESC)
                        .named("idx_reviews_product_status_created")),
                mongo.indexOps("reviews").ensureIndex(new Index()
                        .on("user_id", Sort.Direction.ASC)
                        .on("product_id", Sort.Direction.ASC)
                        .on("order_code", Sort.Direction.ASC)
                        .unique()
                        .named("uk_reviews_user_product_order")),
                mongo.indexOps("review_summaries").ensureIndex(new Index()
                        .on("product_id", Sort.Direction.ASC)
                        .unique()
                        .named("uk_review_summaries_product"))
        ).block();   // chạy 1 lần lúc khởi động, chưa phục vụ request nên block được
    }
}
