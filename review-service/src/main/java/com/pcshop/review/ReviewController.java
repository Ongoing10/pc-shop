package com.pcshop.review;

import com.pcshop.common.webflux.security.CurrentUser;
import com.pcshop.contracts.AuthUser;
import com.pcshop.contracts.BusinessException;
import com.pcshop.contracts.ErrorCode;
import com.pcshop.contracts.PageResponse;
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

/**
 * Review phía khách. GET danh sách và thống kê công khai (khai trong pcshop.security.public-get-paths).
 * Kiểm duyệt: AdminReviewController.
 * TODO: tóm tắt review bằng AI (review_summaries).
 */
@RestController
@RequestMapping("/api/v1/reviews")
public class ReviewController {

    /** productId không bắt buộc: service tự lấy theo sku từ catalog; nếu gửi thì phải khớp sku. */
    public record CreateReviewRequest(String productId, @NotBlank String sku,
                                      @Min(1) @Max(5) int rating, @Size(max = 200) String title,
                                      @Size(max = 5000) String content) {
    }

    public record UpdateReviewRequest(@Min(1) @Max(5) int rating, @Size(max = 200) String title,
                                      @Size(max = 5000) String content) {
    }

    private final ReviewRepository reviews;
    private final ReviewService service;
    private final CatalogClient catalog;
    private final OrderingClient ordering;

    public ReviewController(ReviewRepository reviews, ReviewService service, CatalogClient catalog,
                            OrderingClient ordering) {
        this.reviews = reviews;
        this.service = service;
        this.catalog = catalog;
        this.ordering = ordering;
    }

    /** Công khai: review đã duyệt của một sản phẩm (productId hoặc sku), mới nhất trước, phân trang. */
    @GetMapping
    public Mono<ResponseData<PageResponse<Review>>> byProduct(@RequestParam(required = false) String productId,
                                                             @RequestParam(required = false) String sku,
                                                             @RequestParam(defaultValue = "0") int page,
                                                             @RequestParam(defaultValue = "10") int size) {
        return service.listApproved(productId, sku, page, size).map(ResponseData::success);
    }

    /** Một review: đã duyệt thì công khai; chưa duyệt chỉ người viết hoặc nhân viên xem được. */
    @GetMapping("/{id}")
    public Mono<ResponseData<Review>> detail(@PathVariable String id) {
        return service.findVisible(id, CurrentUser.get()).map(ResponseData::success);
    }

    /** Công khai: điểm trung bình, số lượt, phân bố 1–5 sao (chỉ review APPROVED). */
    @GetMapping("/stats")
    public Mono<ResponseData<ReviewService.Stats>> stats(@RequestParam(required = false) String productId,
                                                        @RequestParam(required = false) String sku) {
        return service.stats(productId, sku).map(ResponseData::success);
    }

    /**
     * Sản phẩm phải tồn tại và đã công bố trong catalog; productId lấy theo sku (gửi kèm thì phải khớp).
     * Người viết có đơn HOÀN TẤT chứa SKU (hỏi ordering) → verifiedPurchase = true, orderCode = đơn đó.
     */
    @PostMapping
    public Mono<ResponseData<Review>> create(@Valid @RequestBody CreateReviewRequest request) {
        Mono<CatalogClient.ProductInfo> product = catalog.product(request.sku())
                .switchIfEmpty(Mono.error(() -> new BusinessException(ErrorCode.BAD_REQUEST,
                        "Sản phẩm không tồn tại: " + request.sku())));
        Mono<OrderingClient.PurchaseCheck> purchase = CurrentUser.token()
                .flatMap(token -> ordering.purchased(token, request.sku()));
        return Mono.zip(CurrentUser.require(), product, purchase)
                .flatMap(t -> {
                    AuthUser user = t.getT1();
                    CatalogClient.ProductInfo p = t.getT2();
                    OrderingClient.PurchaseCheck bought = t.getT3();
                    if (request.productId() != null && !request.productId().isBlank()
                            && !request.productId().equals(p.productId())) {
                        return Mono.error(new BusinessException(ErrorCode.BAD_REQUEST, "productId không khớp sku"));
                    }
                    Review r = new Review();
                    r.setProductId(p.productId());
                    r.setSku(p.sku());
                    r.setUserId(user.id());
                    // hiện công khai dưới review: họ tên, không dùng tên đăng nhập
                    r.setUserDisplayName(displayName(user));
                    r.setVerifiedPurchase(bought.purchased());
                    r.setOrderCode(bought.orderCode());
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

    /** Họ tên trong token; tài khoản chưa khai tên thì "Khách hàng" (không lộ tên đăng nhập). */
    private static String displayName(AuthUser user) {
        return user.displayName() == null || user.displayName().isBlank() ? "Khách hàng" : user.displayName();
    }
}
