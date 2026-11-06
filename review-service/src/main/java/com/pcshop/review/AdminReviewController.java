package com.pcshop.review;

import com.pcshop.common.webflux.security.CurrentUser;
import com.pcshop.contracts.PageResponse;
import com.pcshop.contracts.ResponseData;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import reactor.core.publisher.Mono;

import java.util.List;
import java.util.Set;

/** Kiểm duyệt review (STAFF/ADMIN). Mặc định liệt kê review đang chờ duyệt. */
@RestController
@RequestMapping("/api/v1/admin/reviews")
@PreAuthorize("hasAnyRole('STAFF', 'ADMIN')")
public class AdminReviewController {

    public record ReplyRequest(@NotBlank @Size(max = 2000) String content) {
    }

    public record BulkRequest(@NotEmpty @Size(max = 100) List<String> ids) {
    }

    private static final Set<Integer> APPROVE_FROM = Set.of(Review.PENDING, Review.REJECTED);
    private static final Set<Integer> REJECT_FROM = Set.of(Review.PENDING, Review.APPROVED);

    private final ReviewService service;

    public AdminReviewController(ReviewService service) {
        this.service = service;
    }

    @GetMapping
    public Mono<ResponseData<PageResponse<Review>>> list(@RequestParam(defaultValue = "1") Integer status,
                                                         @RequestParam(required = false) String productId,
                                                         @RequestParam(defaultValue = "0") int page,
                                                         @RequestParam(defaultValue = "20") int size) {
        return service.adminSearch(status, productId, page, size).map(ResponseData::success);
    }

    @GetMapping("/{id}")
    public Mono<ResponseData<Review>> detail(@PathVariable String id) {
        return service.adminGet(id).map(ResponseData::success);
    }

    /** Duyệt: từ PENDING, hoặc duyệt lại review đã từ chối. */
    @PatchMapping("/{id}/approve")
    public Mono<ResponseData<Review>> approve(@PathVariable String id) {
        return service.moderate(id, Review.APPROVED, APPROVE_FROM).map(ResponseData::success);
    }

    /** Từ chối: từ PENDING, hoặc gỡ review đã duyệt (vi phạm phát hiện sau). */
    @PatchMapping("/{id}/reject")
    public Mono<ResponseData<Review>> reject(@PathVariable String id) {
        return service.moderate(id, Review.REJECTED, REJECT_FROM).map(ResponseData::success);
    }

    /** Duyệt nhiều review; một review không duyệt được thì không đổi review nào. */
    @PatchMapping("/bulk/approve")
    public Mono<ResponseData<List<Review>>> approveAll(@Valid @RequestBody BulkRequest request) {
        return service.moderateAll(request.ids(), Review.APPROVED, APPROVE_FROM).map(ResponseData::success);
    }

    @PatchMapping("/bulk/reject")
    public Mono<ResponseData<List<Review>>> rejectAll(@Valid @RequestBody BulkRequest request) {
        return service.moderateAll(request.ids(), Review.REJECTED, REJECT_FROM).map(ResponseData::success);
    }

    /** Trả lời dưới review (ghi đè câu trả lời cũ nếu có). */
    @PostMapping("/{id}/reply")
    public Mono<ResponseData<Review>> reply(@PathVariable String id, @Valid @RequestBody ReplyRequest request) {
        return CurrentUser.require()
                .flatMap(user -> service.reply(id, user, request.content()))
                .map(ResponseData::success);
    }
}
