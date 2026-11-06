package com.pcshop.ordering.voucher;

import com.pcshop.contracts.BulkErrors;
import com.pcshop.contracts.BusinessException;
import com.pcshop.contracts.ErrorCode;
import com.pcshop.contracts.ResponseData;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.PositiveOrZero;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

/**
 * Quản trị voucher (ADMIN), viết tường minh (không dùng base CRUD generic, xem plan mục 6).
 * Không có DELETE: bảng có is_active nên "xóa" = PATCH .../active. Sửa phải gửi kèm version (optimistic lock).
 */
@RestController
@RequestMapping("/api/v1/admin/vouchers")
@PreAuthorize("hasRole('ADMIN')")
public class AdminVoucherController {

    /** Voucher cho màn admin: thêm danh sách danh mục đã đọc từ cột JSONB. */
    public record VoucherResponse(Long id, String code, String name, Integer type, BigDecimal value,
                                  BigDecimal maxDiscountAmount, BigDecimal minOrderAmount,
                                  List<String> applicableCategories, Integer usageLimit, Integer usedCount,
                                  Integer perUserLimit, LocalDateTime startAt, LocalDateTime endAt,
                                  Integer isActive, Long version, LocalDateTime createdAt, LocalDateTime updatedAt) {
    }

    public record CreateVoucherRequest(
            @NotBlank @Pattern(regexp = "^[A-Za-z0-9_-]{3,50}$", message = "Mã 3-50 ký tự chữ, số, _ -") String code,
            @NotBlank String name, @NotNull Integer type, @NotNull @PositiveOrZero BigDecimal value,
            @Positive BigDecimal maxDiscountAmount, @PositiveOrZero BigDecimal minOrderAmount,
            List<String> applicableCategories, @Positive Integer usageLimit, @Positive Integer perUserLimit,
            LocalDateTime startAt, LocalDateTime endAt) {
    }

    public record UpdateVoucherRequest(
            @NotBlank String name, @NotNull Integer type, @NotNull @PositiveOrZero BigDecimal value,
            @Positive BigDecimal maxDiscountAmount, @PositiveOrZero BigDecimal minOrderAmount,
            List<String> applicableCategories, @Positive Integer usageLimit, @Positive Integer perUserLimit,
            LocalDateTime startAt, LocalDateTime endAt, @NotNull Long version) {
    }

    public record ActiveRequest(@NotNull Boolean active) {
    }

    public record BulkActiveRequest(@NotEmpty List<Long> ids, @NotNull Boolean active) {
    }

    private final VoucherRepository vouchers;
    private final VoucherService service;

    public AdminVoucherController(VoucherRepository vouchers, VoucherService service) {
        this.vouchers = vouchers;
        this.service = service;
    }

    /** Tất cả voucher, kể cả đã ngừng hoạt động. */
    @GetMapping
    public Mono<ResponseData<List<VoucherResponse>>> list() {
        return vouchers.findAllByOrderByIdDesc().map(this::toResponse).collectList().map(ResponseData::success);
    }

    /** Chi tiết cho form sửa (kèm version để gửi lại khi PUT). */
    @GetMapping("/{id}")
    public Mono<ResponseData<VoucherResponse>> detail(@PathVariable Long id) {
        return find(id).map(this::toResponse).map(ResponseData::success);
    }

    @PostMapping
    public Mono<ResponseData<VoucherResponse>> create(@Valid @RequestBody CreateVoucherRequest r) {
        String code = r.code().toUpperCase();
        return vouchers.existsByCode(code)
                .flatMap(exists -> {
                    if (exists) {
                        return Mono.error(new BusinessException(ErrorCode.CONFLICT, "Mã voucher đã tồn tại"));
                    }
                    Voucher v = new Voucher();
                    v.setCode(code);
                    apply(v, r.name(), r.type(), r.value(), r.maxDiscountAmount(), r.minOrderAmount(),
                            r.applicableCategories(), r.usageLimit(), r.perUserLimit(), r.startAt(), r.endAt());
                    v.setUsedCount(0);
                    v.setIsActive(1);
                    return vouchers.save(v);
                })
                .map(this::toResponse)
                .map(ResponseData::success);
    }

    @PutMapping("/{id}")
    public Mono<ResponseData<VoucherResponse>> update(@PathVariable Long id, @Valid @RequestBody UpdateVoucherRequest r) {
        return find(id)
                .flatMap(v -> {
                    if (!v.getVersion().equals(r.version())) {
                        return Mono.error(new BusinessException(ErrorCode.CONFLICT,
                                "Voucher đã bị người khác thay đổi, vui lòng tải lại"));
                    }
                    apply(v, r.name(), r.type(), r.value(), r.maxDiscountAmount(), r.minOrderAmount(),
                            r.applicableCategories(), r.usageLimit(), r.perUserLimit(), r.startAt(), r.endAt());
                    return vouchers.save(v);
                })
                .map(this::toResponse)
                .map(ResponseData::success);
    }

    @PatchMapping("/{id}/active")
    public Mono<ResponseData<VoucherResponse>> setActive(@PathVariable Long id, @Valid @RequestBody ActiveRequest r) {
        return find(id)
                .flatMap(v -> {
                    v.setIsActive(r.active() ? 1 : 0);
                    return vouchers.save(v);
                })
                .map(this::toResponse)
                .map(ResponseData::success);
    }

    /** Ngừng/mở nhiều voucher trong một transaction; id nào không tồn tại thì không đổi gì. */
    @PatchMapping("/bulk/active")
    @Transactional
    public Mono<ResponseData<List<VoucherResponse>>> setActiveBulk(@Valid @RequestBody BulkActiveRequest r) {
        BulkErrors errors = BulkErrors.check(r.ids());
        return vouchers.findAllById(r.ids()).collectList()
                .flatMap(found -> {
                    r.ids().stream().filter(id -> found.stream().noneMatch(v -> v.getId().equals(id)))
                            .forEach(id -> errors.add(id, "Không tìm thấy voucher"));
                    errors.throwIfAny();
                    found.forEach(v -> v.setIsActive(r.active() ? 1 : 0));
                    return Flux.fromIterable(found).concatMap(vouchers::save).map(this::toResponse).collectList();
                })
                .map(ResponseData::success);
    }

    // ------------------------------------------------------------------

    private void apply(Voucher v, String name, Integer type, BigDecimal value, BigDecimal maxDiscount,
                       BigDecimal minOrder, List<String> categories, Integer usageLimit, Integer perUserLimit,
                       LocalDateTime startAt, LocalDateTime endAt) {
        if (type < Voucher.PERCENT || type > Voucher.FREE_SHIPPING) {
            throw new BusinessException(ErrorCode.BAD_REQUEST, "type phải là 1 (giảm %), 2 (giảm tiền) hoặc 3 (miễn phí ship)");
        }
        if (type == Voucher.PERCENT && value.compareTo(BigDecimal.valueOf(100)) > 0) {
            throw new BusinessException(ErrorCode.BAD_REQUEST, "Giảm theo % không được quá 100");
        }
        if (type != Voucher.FREE_SHIPPING && value.signum() == 0) {
            throw new BusinessException(ErrorCode.BAD_REQUEST, "Giá trị giảm phải lớn hơn 0");
        }
        if (startAt != null && endAt != null && !endAt.isAfter(startAt)) {
            throw new BusinessException(ErrorCode.BAD_REQUEST, "endAt phải sau startAt");
        }
        v.setName(name);
        v.setType(type);
        v.setValue(value);
        v.setMaxDiscountAmount(maxDiscount);
        v.setMinOrderAmount(minOrder == null ? BigDecimal.ZERO : minOrder);
        v.setApplicableCategories(service.toJson(categories));
        v.setUsageLimit(usageLimit);
        v.setPerUserLimit(perUserLimit);
        v.setStartAt(startAt);
        v.setEndAt(endAt);
    }

    private Mono<Voucher> find(Long id) {
        return vouchers.findById(id).switchIfEmpty(Mono.error(() -> BusinessException.notFound("voucher", id)));
    }

    private VoucherResponse toResponse(Voucher v) {
        return new VoucherResponse(v.getId(), v.getCode(), v.getName(), v.getType(), v.getValue(),
                v.getMaxDiscountAmount(), v.getMinOrderAmount(), service.categories(v), v.getUsageLimit(),
                v.getUsedCount(), v.getPerUserLimit(), v.getStartAt(), v.getEndAt(), v.getIsActive(),
                v.getVersion(), v.getCreatedAt(), v.getUpdatedAt());
    }
}
