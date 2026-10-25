package com.pcshop.ordering.voucher;

import com.pcshop.contracts.BusinessException;
import com.pcshop.contracts.ErrorCode;
import com.pcshop.contracts.ResponseData;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import reactor.core.publisher.Mono;

import java.math.BigDecimal;
import java.util.List;

/**
 * KHUNG CRUD voucher, viết tường minh (không dùng base CRUD generic, xem plan mục 6).
 * GET công khai (khai trong pcshop.security.public-get-paths), POST chỉ ADMIN.
 */
@RestController
@RequestMapping("/api/v1/vouchers")
public class VoucherController {

    public record CreateVoucherRequest(@NotBlank String code, @NotBlank String name,
                                       @NotNull Integer type, @NotNull @Positive BigDecimal value) {
    }

    private final VoucherRepository vouchers;

    public VoucherController(VoucherRepository vouchers) {
        this.vouchers = vouchers;
    }

    @GetMapping
    public Mono<ResponseData<List<Voucher>>> activeVouchers() {
        return vouchers.findAllByIsActiveOrderByIdDesc(1).collectList().map(ResponseData::success);
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public Mono<ResponseData<Voucher>> create(@Valid @RequestBody CreateVoucherRequest request) {
        return vouchers.existsByCode(request.code())
                .flatMap(exists -> {
                    if (exists) {
                        return Mono.error(new BusinessException(ErrorCode.CONFLICT, "Mã voucher đã tồn tại"));
                    }
                    Voucher v = new Voucher();
                    v.setCode(request.code());
                    v.setName(request.name());
                    v.setType(request.type());
                    v.setValue(request.value());
                    v.setUsedCount(0);
                    v.setIsActive(1);
                    return vouchers.save(v);
                })
                .map(ResponseData::success);
    }
}
