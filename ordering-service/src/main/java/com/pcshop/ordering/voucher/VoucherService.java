package com.pcshop.ordering.voucher;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.pcshop.contracts.BusinessException;
import com.pcshop.contracts.ErrorCode;
import io.r2dbc.postgresql.codec.Json;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Mono;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;
import java.util.UUID;

/**
 * Kiểm tra voucher và tính số tiền giảm. Dùng chung cho POST /vouchers/validate và POST /checkout/preview.
 * Chỉ ĐỌC: lượt dùng (used_count, voucher_usages) được ghi khi đặt hàng (đợt 2).
 */
@Service
public class VoucherService {

    /**
     * Kết quả kiểm tra.
     * @param discountAmount số tiền giảm trên tiền hàng (voucher miễn phí vận chuyển: 0, xem freeShipping)
     */
    public record Evaluation(boolean valid, String code, String name, Integer type, BigDecimal discountAmount,
                             boolean freeShipping, String reason) {

        static Evaluation invalid(String code, String reason) {
            return new Evaluation(false, code, null, null, BigDecimal.ZERO, false, reason);
        }
    }

    private static final TypeReference<List<String>> STRING_LIST = new TypeReference<>() {
    };

    private final VoucherRepository vouchers;
    private final VoucherUsageRepository usages;
    private final ObjectMapper mapper;

    public VoucherService(VoucherRepository vouchers, VoucherUsageRepository usages, ObjectMapper mapper) {
        this.vouchers = vouchers;
        this.usages = usages;
        this.mapper = mapper;
    }

    /** Kiểm tra theo tổng tiền hàng (không có chi tiết từng dòng): cả subtotal được tính là đủ điều kiện. */
    public Mono<Evaluation> validate(String code, UUID userId, BigDecimal subtotal, Collection<String> categories) {
        return evaluate(code, userId, subtotal, subtotal, categories);
    }

    /**
     * @param eligibleSubtotal phần tiền hàng thuộc danh mục voucher áp dụng (bằng subtotal nếu voucher không giới hạn danh mục)
     */
    public Mono<Evaluation> evaluate(String code, UUID userId, BigDecimal subtotal, BigDecimal eligibleSubtotal,
                                     Collection<String> categories) {
        String normalized = code == null ? "" : code.trim().toUpperCase();
        return vouchers.findByCode(normalized)
                .flatMap(v -> check(v, userId, subtotal, eligibleSubtotal, categories))
                .defaultIfEmpty(Evaluation.invalid(normalized, "Mã giảm giá không tồn tại"));
    }

    /** Danh mục voucher áp dụng; rỗng = mọi danh mục (mã không tồn tại cũng trả rỗng, evaluate sẽ báo lỗi). */
    public Mono<List<String>> applicableCategories(String code) {
        String normalized = code == null ? "" : code.trim().toUpperCase();
        return vouchers.findByCode(normalized).map(this::categories).defaultIfEmpty(List.of());
    }

    private Mono<Evaluation> check(Voucher v, UUID userId, BigDecimal subtotal, BigDecimal eligibleSubtotal,
                                   Collection<String> categories) {
        LocalDateTime now = LocalDateTime.now();
        if (v.getIsActive() == null || v.getIsActive() != 1) {
            return Mono.just(Evaluation.invalid(v.getCode(), "Mã giảm giá đã ngừng áp dụng"));
        }
        if (v.getStartAt() != null && now.isBefore(v.getStartAt())) {
            return Mono.just(Evaluation.invalid(v.getCode(), "Mã giảm giá chưa đến thời gian áp dụng"));
        }
        if (v.getEndAt() != null && now.isAfter(v.getEndAt())) {
            return Mono.just(Evaluation.invalid(v.getCode(), "Mã giảm giá đã hết hạn"));
        }
        if (v.getMinOrderAmount() != null && subtotal.compareTo(v.getMinOrderAmount()) < 0) {
            return Mono.just(Evaluation.invalid(v.getCode(),
                    "Đơn tối thiểu " + v.getMinOrderAmount().stripTrailingZeros().toPlainString() + "đ để dùng mã này"));
        }
        if (v.getUsageLimit() != null && v.getUsedCount() != null && v.getUsedCount() >= v.getUsageLimit()) {
            return Mono.just(Evaluation.invalid(v.getCode(), "Mã giảm giá đã hết lượt sử dụng"));
        }
        List<String> allowed = categories(v);
        if (!allowed.isEmpty() && (categories == null || categories.stream().noneMatch(allowed::contains))) {
            return Mono.just(Evaluation.invalid(v.getCode(), "Mã chỉ áp dụng cho danh mục " + allowed));
        }
        Mono<Long> used = v.getPerUserLimit() == null || userId == null
                ? Mono.just(0L)
                : usages.countByVoucherIdAndUserId(v.getId(), userId);
        return used.map(count -> {
            if (v.getPerUserLimit() != null && count >= v.getPerUserLimit()) {
                return Evaluation.invalid(v.getCode(), "Bạn đã dùng hết lượt của mã này");
            }
            return new Evaluation(true, v.getCode(), v.getName(), v.getType(),
                    discount(v, eligibleSubtotal), v.getType() == Voucher.FREE_SHIPPING, null);
        });
    }

    private static BigDecimal discount(Voucher v, BigDecimal base) {
        BigDecimal amount = switch (v.getType()) {
            case Voucher.PERCENT -> base.multiply(v.getValue()).divide(BigDecimal.valueOf(100), 0, RoundingMode.HALF_UP);
            case Voucher.AMOUNT -> v.getValue().min(base);
            default -> BigDecimal.ZERO;
        };
        if (v.getMaxDiscountAmount() != null) {
            amount = amount.min(v.getMaxDiscountAmount());
        }
        return amount.max(BigDecimal.ZERO);
    }

    // ------------------------------------------------------------------ JSONB applicable_categories

    public List<String> categories(Voucher v) {
        Json json = v.getApplicableCategories();
        if (json == null) {
            return List.of();
        }
        try {
            List<String> list = mapper.readValue(json.asString(), STRING_LIST);
            return list == null ? List.of() : list;
        } catch (JsonProcessingException e) {
            throw new BusinessException(ErrorCode.INTERNAL_ERROR, "applicable_categories của voucher " + v.getCode() + " không hợp lệ");
        }
    }

    public Json toJson(List<String> categories) {
        if (categories == null || categories.isEmpty()) {
            return null;
        }
        try {
            return Json.of(mapper.writeValueAsString(categories));
        } catch (JsonProcessingException e) {
            throw new BusinessException(ErrorCode.BAD_REQUEST, "Danh sách danh mục không hợp lệ");
        }
    }
}
