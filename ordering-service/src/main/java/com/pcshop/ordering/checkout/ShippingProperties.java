package com.pcshop.ordering.checkout;

import org.springframework.boot.context.properties.ConfigurationProperties;

import java.math.BigDecimal;
import java.util.List;

/**
 * Quy tắc phí vận chuyển đơn giản (khối pcshop.shipping trong application.yml):
 * miễn phí khi tiền hàng (sau giảm) ≥ freeThreshold; nội vùng (tỉnh có kho) innerFee; còn lại outerFee.
 */
@ConfigurationProperties(prefix = "pcshop.shipping")
public record ShippingProperties(List<String> innerProvinces, BigDecimal innerFee, BigDecimal outerFee,
                                 BigDecimal freeThreshold) {

    public ShippingProperties {
        innerProvinces = innerProvinces == null ? List.of() : List.copyOf(innerProvinces);
        innerFee = innerFee == null ? BigDecimal.valueOf(20000) : innerFee;
        outerFee = outerFee == null ? BigDecimal.valueOf(40000) : outerFee;
        freeThreshold = freeThreshold == null ? BigDecimal.valueOf(5000000) : freeThreshold;
    }

    public BigDecimal feeFor(String provinceCode, BigDecimal amountAfterDiscount) {
        if (amountAfterDiscount.compareTo(freeThreshold) >= 0) {
            return BigDecimal.ZERO;
        }
        return provinceCode != null && innerProvinces.contains(provinceCode) ? innerFee : outerFee;
    }
}
