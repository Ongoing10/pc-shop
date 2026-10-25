package com.pcshop.review;

import org.springframework.data.mongodb.repository.ReactiveMongoRepository;
import reactor.core.publisher.Flux;

public interface ReviewRepository extends ReactiveMongoRepository<Review, String> {

    Flux<Review> findAllByProductIdAndStatusOrderByCreatedAtDesc(String productId, int status);
}
