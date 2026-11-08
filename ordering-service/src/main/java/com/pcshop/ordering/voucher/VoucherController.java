package com.pcshop.ordering.voucher;

import com.pcshop.common.webflux.security.CurrentUser;
import com.pcshop.contracts.ResponseData;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import reactor.core.publisher.Mono;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

/**
 * Voucher phía khách. GET công khai (khai trong pcshop.security.public-get-paths), validate cần đăng nhập
 * (để kiểm tra số lượt đã dùng của user). Quản trị voucher: AdminVoucherController.
 */
@RestController
@RequestMapping("/api/v1/vouchers")
public class VoucherController {

    public record ValidateRequest(@NotBlank String code, @NotNull @PositiveOrZero BigDecimal subtotal,
                                  List<String> categories) {
    }

    private final VoucherRepository vouchers;
    private final VoucherService service;

    public VoucherController(VoucherRepository vouchers, VoucherService service) {
        this.vouchers = vouchers;
        this.service = service;
    }

    /** Voucher hiển thị cho khách: không kèm số lượt đã dùng, version, người tạo/sửa. */
    public record PublicVoucher(String code, String name, Integer type, BigDecimal value, BigDecimal maxDiscountAmount,
                                BigDecimal minOrderAmount, List<String> applicableCategories, Integer perUserLimit,
                                LocalDateTime startAt, LocalDateTime endAt) {
    }

    /** Voucher dùng được ngay lúc này: đang bật, trong thời gian áp dụng, chưa hết lượt. */
    @GetMapping
    public Mono<ResponseData<List<PublicVoucher>>> activeVouchers() {
        LocalDateTime now = LocalDateTime.now();
        return vouchers.findAllByIsActiveOrderByIdDesc(1)
                .filter(v -> (v.getStartAt() == null || !now.isBefore(v.getStartAt()))
                        && (v.getEndAt() == null || !now.isAfter(v.getEndAt()))
                        && (v.getUsageLimit() == null || v.getUsedCount() == null
                        || v.getUsedCount() < v.getUsageLimit()))
                .map(v -> new PublicVoucher(v.getCode(), v.getName(), v.getType(), v.getValue(),
                        v.getMaxDiscountAmount(), v.getMinOrderAmount(), service.categories(v), v.getPerUserLimit(),
                        v.getStartAt(), v.getEndAt()))
                .collectList()
                .map(ResponseData::success);
    }

    /** Kiểm tra mã: hợp lệ không, giảm bao nhiêu, lý do nếu không hợp lệ (luôn trả 200, xem field valid). */
    @PostMapping("/validate")
    public Mono<ResponseData<VoucherService.Evaluation>> validate(@Valid @RequestBody ValidateRequest request) {
        return CurrentUser.require()
                .flatMap(user -> service.validate(request.code(), user.id(), request.subtotal(),
                        request.categories() == null ? List.of() : request.categories()))
                .map(ResponseData::success);
    }
}
