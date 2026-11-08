package com.pcshop.review;

import org.springframework.data.mongodb.repository.ReactiveMongoRepository;

/** Truy vấn có lọc/phân trang nằm ở ReviewService (ReactiveMongoTemplate). */
public interface ReviewRepository extends ReactiveMongoRepository<Review, String> {
}
