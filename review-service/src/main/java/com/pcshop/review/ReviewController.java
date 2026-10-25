package com.pcshop.review;

import com.pcshop.common.webflux.security.CurrentUser;
import com.pcshop.contracts.ResponseData;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import reactor.core.publisher.Mono;

import java.time.Instant;
import java.util.List;

/**
 * KHUNG review.
 * TODO: kiểm tra đã mua hàng (gọi ordering), duyệt review, bắn event cập nhật rating_avg cho catalog,
 *       tóm tắt review bằng AI (review_summaries).
 */
@RestController
@RequestMapping("/api/v1/reviews")
public class ReviewController {

    public static final int APPROVED = 2;
    public static final int PENDING = 1;

    public record CreateReviewRequest(@NotBlank String productId, @NotBlank String sku,
                                      @Min(1) @Max(5) int rating, String title, String content) {
    }

    private final ReviewRepository reviews;

    public ReviewController(ReviewRepository reviews) {
        this.reviews = reviews;
    }

    /** Công khai: review đã duyệt của một sản phẩm. */
    @GetMapping
    public Mono<ResponseData<List<Review>>> byProduct(@RequestParam String productId) {
        return reviews.findAllByProductIdAndStatusOrderByCreatedAtDesc(productId, APPROVED)
                .collectList()
                .map(ResponseData::success);
    }

    @PostMapping
    public Mono<ResponseData<Review>> create(@Valid @RequestBody CreateReviewRequest request) {
        return CurrentUser.require().flatMap(user -> {
            Review r = new Review();
            r.setProductId(request.productId());
            r.setSku(request.sku());
            r.setUserId(user.id());
            r.setUserDisplayName(user.username());
            r.setRating(request.rating());
            r.setTitle(request.title());
            r.setContent(request.content());
            r.setStatus(PENDING);
            r.setCreatedAt(Instant.now());
            return reviews.save(r);
        }).map(ResponseData::success);
    }
}
