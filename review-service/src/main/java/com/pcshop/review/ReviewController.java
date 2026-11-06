package com.pcshop.review;

import com.pcshop.common.webflux.security.CurrentUser;
import com.pcshop.contracts.BusinessException;
import com.pcshop.contracts.ErrorCode;
import com.pcshop.contracts.ResponseData;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import reactor.core.publisher.Mono;

import java.time.Instant;
import java.util.List;

/**
 * Review phía khách. GET danh sách và thống kê công khai (khai trong pcshop.security.public-get-paths).
 * Kiểm duyệt: AdminReviewController.
 * TODO: kiểm tra đã mua hàng (gọi ordering) để đặt is_verified_purchase, tóm tắt review bằng AI (review_summaries).
 */
@RestController
@RequestMapping("/api/v1/reviews")
public class ReviewController {

    public record CreateReviewRequest(@NotBlank String productId, @NotBlank String sku,
                                      @Min(1) @Max(5) int rating, @Size(max = 200) String title,
                                      @Size(max = 5000) String content) {
    }

    public record UpdateReviewRequest(@Min(1) @Max(5) int rating, @Size(max = 200) String title,
                                      @Size(max = 5000) String content) {
    }

    private final ReviewRepository reviews;
    private final ReviewService service;

    public ReviewController(ReviewRepository reviews, ReviewService service) {
        this.reviews = reviews;
        this.service = service;
    }

    /** Công khai: review đã duyệt của một sản phẩm. */
    @GetMapping
    public Mono<ResponseData<List<Review>>> byProduct(@RequestParam String productId) {
        return reviews.findAllByProductIdAndStatusOrderByCreatedAtDesc(productId, Review.APPROVED)
                .collectList()
                .map(ResponseData::success);
    }

    /** Một review: đã duyệt thì công khai; chưa duyệt chỉ người viết hoặc nhân viên xem được. */
    @GetMapping("/{id}")
    public Mono<ResponseData<Review>> detail(@PathVariable String id) {
        return service.findVisible(id, CurrentUser.get()).map(ResponseData::success);
    }

    /** Công khai: điểm trung bình, số lượt, phân bố 1–5 sao (chỉ review APPROVED). */
    @GetMapping("/stats")
    public Mono<ResponseData<ReviewService.Stats>> stats(@RequestParam String productId) {
        return service.stats(productId).map(ResponseData::success);
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
            r.setStatus(Review.PENDING);
            r.setCreatedAt(Instant.now());
            r.setUpdatedAt(r.getCreatedAt());
            return reviews.save(r);
        })
                // uk_reviews_user_product_order: mỗi user một review còn hiệu lực cho một sản phẩm (theo đơn)
                .onErrorMap(DuplicateKeyException.class, e -> new BusinessException(ErrorCode.CONFLICT,
                        "Bạn đã đánh giá sản phẩm này; hãy sửa hoặc gỡ đánh giá cũ trước"))
                .map(ResponseData::success);
    }

    /** Chủ review sửa, chỉ khi còn PENDING. */
    @PutMapping("/{id}")
    public Mono<ResponseData<Review>> update(@PathVariable String id, @Valid @RequestBody UpdateReviewRequest request) {
        return CurrentUser.require()
                .flatMap(user -> service.update(id, user, request.rating(), request.title(), request.content()))
                .map(ResponseData::success);
    }

    /** Chủ review tự gỡ: status DELETED_BY_USER (không xóa thật). */
    @DeleteMapping("/{id}")
    public Mono<ResponseData<Review>> delete(@PathVariable String id) {
        return CurrentUser.require()
                .flatMap(user -> service.deleteByOwner(id, user))
                .map(ResponseData::success);
    }
}
