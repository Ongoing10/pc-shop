package com.pcshop.review;

import com.pcshop.contracts.AuthUser;
import com.pcshop.contracts.BulkErrors;
import com.pcshop.contracts.BusinessException;
import com.pcshop.contracts.ErrorCode;
import com.pcshop.contracts.PageResponse;
import com.pcshop.events.Events;
import com.pcshop.events.Topics;
import org.springframework.data.domain.Sort;
import org.springframework.data.mongodb.core.ReactiveMongoTemplate;
import org.springframework.data.mongodb.core.aggregation.Aggregation;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

/**
 * Nghiệp vụ review: khách sửa/gỡ review của mình, nhân viên kiểm duyệt và trả lời, thống kê điểm.
 * Tập review ĐÃ DUYỆT của sản phẩm đổi (duyệt, từ chối, gỡ) → event review.stats-changed (catalog cập nhật
 * rating_avg/rating_count); trả lời → review.replied (notification báo người viết).
 */
@Service
public class ReviewService {

    public record Stats(String productId, String sku, double average, long count, Map<Integer, Long> distribution) {
    }

    private final ReviewRepository reviews;
    private final ReactiveMongoTemplate mongo;
    private final ReviewOutbox outbox;

    public ReviewService(ReviewRepository reviews, ReactiveMongoTemplate mongo, ReviewOutbox outbox) {
        this.reviews = reviews;
        this.mongo = mongo;
        this.outbox = outbox;
    }

    /**
     * Một review: đã duyệt thì ai cũng xem được; còn lại chỉ người viết hoặc STAFF/ADMIN
     * ({@code viewer} rỗng = khách chưa đăng nhập).
     */
    public Mono<Review> findVisible(String id, Mono<AuthUser> viewer) {
        return find(id).flatMap(r -> r.getStatus() == Review.APPROVED
                ? Mono.just(r)
                : viewer.filter(u -> u.isStaff() || u.id().equals(r.getUserId()))
                        .map(u -> r)
                        .switchIfEmpty(Mono.error(() -> BusinessException.notFound("review", id))));
    }

    /** Chi tiết cho trang kiểm duyệt (mọi trạng thái). */
    public Mono<Review> adminGet(String id) {
        return find(id);
    }

    /** Chủ review sửa nội dung, chỉ khi còn chờ duyệt (đã duyệt thì sửa sẽ lách qua kiểm duyệt). */
    public Mono<Review> update(String id, AuthUser user, int rating, String title, String content) {
        return owned(id, user).flatMap(r -> {
            if (r.getStatus() != Review.PENDING) {
                return Mono.error(new BusinessException(ErrorCode.BAD_REQUEST, "Chỉ sửa được review đang chờ duyệt"));
            }
            r.setRating(rating);
            r.setTitle(title);
            r.setContent(content);
            r.setUpdatedAt(Instant.now());
            return reviews.save(r);
        });
    }

    /** Chủ review tự gỡ: chuyển status DELETED_BY_USER (không xóa thật). */
    public Mono<Review> deleteByOwner(String id, AuthUser user) {
        return owned(id, user).flatMap(r -> {
            if (r.getStatus() == Review.DELETED_BY_USER) {
                return Mono.just(r);
            }
            boolean wasApproved = r.getStatus() == Review.APPROVED;
            r.setStatus(Review.DELETED_BY_USER);
            r.setUpdatedAt(Instant.now());
            return reviews.save(r).flatMap(saved -> wasApproved ? publishStats(saved.getProductId(), saved.getSku())
                    .thenReturn(saved) : Mono.just(saved));
        });
    }

    public Mono<PageResponse<Review>> adminSearch(Integer status, String productId, int page, int size) {
        int safeSize = Math.min(Math.max(size, 1), 100);
        int safePage = Math.max(page, 0);
        Criteria criteria = new Criteria();
        if (status != null) {
            criteria = criteria.and("status").is(status);
        }
        if (productId != null && !productId.isBlank()) {
            criteria = criteria.and("product_id").is(productId);
        }
        Query count = new Query(criteria);
        Query query = new Query(criteria).with(Sort.by(Sort.Direction.DESC, "created_at"))
                .skip((long) safePage * safeSize).limit(safeSize);
        return Mono.zip(mongo.find(query, Review.class).collectList(), mongo.count(count, Review.class))
                .map(t -> PageResponse.of(t.getT1(), safePage, safeSize, t.getT2()));
    }

    /** Đổi trạng thái kiểm duyệt; chỉ chấp nhận chuyển từ các trạng thái trong {@code allowedFrom}. */
    public Mono<Review> moderate(String id, int toStatus, Set<Integer> allowedFrom) {
        return find(id).flatMap(r -> {
            checkModeration(r, toStatus, allowedFrom);
            r.setStatus(toStatus);
            r.setUpdatedAt(Instant.now());
            return reviews.save(r).flatMap(saved -> publishStats(saved.getProductId(), saved.getSku()).thenReturn(saved));
        });
    }

    /**
     * Duyệt/từ chối nhiều review, "tất cả hoặc không": kiểm tra hết rồi mới ghi.
     * Mongo standalone không có transaction nên bước ghi không nguyên tử nếu Mongo lỗi giữa chừng.
     */
    public Mono<List<Review>> moderateAll(List<String> ids, int toStatus, Set<Integer> allowedFrom) {
        BulkErrors errors = BulkErrors.check(ids);
        return reviews.findAllById(ids).collectList().flatMap(found -> {
            ids.stream().filter(id -> found.stream().noneMatch(r -> r.getId().equals(id)))
                    .forEach(id -> errors.add(id, "Không tìm thấy review"));
            found.forEach(r -> errors.tryRun(r.getId(), () -> checkModeration(r, toStatus, allowedFrom)));
            errors.throwIfAny();
            Instant now = Instant.now();
            found.forEach(r -> {
                r.setStatus(toStatus);
                r.setUpdatedAt(now);
            });
            found.sort(Comparator.comparing(r -> ids.indexOf(r.getId())));
            Map<String, String> skuByProduct = new LinkedHashMap<>();
            found.forEach(r -> skuByProduct.putIfAbsent(r.getProductId(), r.getSku()));
            return Flux.fromIterable(found).concatMap(reviews::save).collectList()
                    .flatMap(saved -> Flux.fromIterable(skuByProduct.entrySet())
                            .concatMap(e -> publishStats(e.getKey(), e.getValue()))
                            .then(Mono.just(saved)));
        });
    }

    private static void checkModeration(Review r, int toStatus, Set<Integer> allowedFrom) {
        if (!allowedFrom.contains(r.getStatus())) {
            throw new BusinessException(ErrorCode.BAD_REQUEST,
                    "Không thể chuyển review từ trạng thái " + r.getStatus() + " sang " + toStatus);
        }
    }

    public Mono<Review> reply(String id, AuthUser staff, String content) {
        return find(id).flatMap(r -> {
            if (r.getStatus() == Review.DELETED_BY_USER) {
                return Mono.error(new BusinessException(ErrorCode.BAD_REQUEST, "Review đã bị người viết gỡ"));
            }
            Review.AdminReply reply = new Review.AdminReply();
            reply.setContent(content);
            reply.setRepliedBy(staff.id());
            reply.setRepliedAt(Instant.now());
            r.setAdminReply(reply);
            r.setUpdatedAt(Instant.now());
            return reviews.save(r).flatMap(saved -> outbox.add(Topics.REVIEW_REPLIED, saved.getId(),
                    new Events.ReviewReplied(UUID.randomUUID(), saved.getId(), saved.getUserId(), saved.getProductId(),
                            saved.getSku(), content, Instant.now())).thenReturn(saved));
        });
    }

    /** Review đã duyệt của một sản phẩm (theo productId hoặc sku), mới nhất trước, phân trang. */
    public Mono<PageResponse<Review>> listApproved(String productId, String sku, int page, int size) {
        int safeSize = Math.min(Math.max(size, 1), 100);
        int safePage = Math.max(page, 0);
        Criteria criteria = productCriteria(productId, sku).and("status").is(Review.APPROVED);
        Query query = new Query(criteria).with(Sort.by(Sort.Direction.DESC, "created_at"))
                .skip((long) safePage * safeSize).limit(safeSize);
        return Mono.zip(mongo.find(query, Review.class).collectList(), mongo.count(new Query(criteria), Review.class))
                .map(t -> PageResponse.of(t.getT1(), safePage, safeSize, t.getT2()));
    }

    /** Điểm trung bình, số lượt và phân bố 1–5 sao, chỉ tính review APPROVED (theo productId hoặc sku). */
    public Mono<Stats> stats(String productId, String sku) {
        Aggregation agg = Aggregation.newAggregation(
                Aggregation.match(productCriteria(productId, sku).and("status").is(Review.APPROVED)),
                Aggregation.group("rating").count().as("count"));
        return mongo.aggregate(agg, "reviews", org.bson.Document.class)
                .collectList()
                .map(rows -> {
                    Map<Integer, Long> distribution = new LinkedHashMap<>();
                    for (int star = 1; star <= 5; star++) {
                        distribution.put(star, 0L);
                    }
                    long count = 0;
                    long sum = 0;
                    for (org.bson.Document row : rows) {
                        int star = ((Number) row.get("_id")).intValue();
                        long n = ((Number) row.get("count")).longValue();
                        distribution.merge(star, n, Long::sum);
                        count += n;
                        sum += (long) star * n;
                    }
                    double avg = count == 0 ? 0 : BigDecimal.valueOf((double) sum / count)
                            .setScale(2, RoundingMode.HALF_UP).doubleValue();
                    return new Stats(productId, sku, avg, count, distribution);
                });
    }

    /** Thống kê sao hiện tại của sản phẩm → outbox (catalog ghi đè rating_avg/rating_count). */
    private Mono<Void> publishStats(String productId, String sku) {
        return stats(productId, null).flatMap(st -> outbox.add(Topics.REVIEW_STATS_CHANGED, productId,
                new Events.ReviewStatsChanged(UUID.randomUUID(), productId, sku, st.average(), st.count(), Instant.now())));
    }

    /** Lọc theo productId (ObjectId của catalog) hoặc sku; phải có ít nhất một. */
    private static Criteria productCriteria(String productId, String sku) {
        boolean byId = productId != null && !productId.isBlank();
        boolean bySku = sku != null && !sku.isBlank();
        if (!byId && !bySku) {
            throw new BusinessException(ErrorCode.BAD_REQUEST, "Cần productId hoặc sku");
        }
        return byId ? Criteria.where("product_id").is(productId) : Criteria.where("sku").is(sku);
    }

    // ------------------------------------------------------------------

    private Mono<Review> find(String id) {
        return reviews.findById(id).switchIfEmpty(Mono.error(() -> BusinessException.notFound("review", id)));
    }

    private Mono<Review> owned(String id, AuthUser user) {
        return find(id).flatMap(r -> user.id().equals(r.getUserId())
                ? Mono.just(r)
                : Mono.error(BusinessException.forbidden("Đây không phải review của bạn")));
    }
}
