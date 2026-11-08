package com.pcshop.ordering.voucher;

import org.junit.jupiter.api.Test;

import java.math.BigDecimal;

import static org.assertj.core.api.Assertions.assertThat;

class VoucherDiscountTest {

    private static Voucher voucher(int type, String value, String maxDiscount) {
        Voucher v = new Voucher();
        v.setType(type);
        v.setValue(new BigDecimal(value));
        v.setMaxDiscountAmount(maxDiscount == null ? null : new BigDecimal(maxDiscount));
        return v;
    }

    @Test
    void percentIsRoundedToWholeDong() {
        assertThat(VoucherService.discount(voucher(Voucher.PERCENT, "10", null), new BigDecimal("1234567")))
                .isEqualByComparingTo("123457");
    }

    @Test
    void percentIsCappedByMaxDiscount() {
        assertThat(VoucherService.discount(voucher(Voucher.PERCENT, "10", "500000"), new BigDecimal("20000000")))
                .isEqualByComparingTo("500000");
    }

    @Test
    void amountNeverExceedsBase() {
        assertThat(VoucherService.discount(voucher(Voucher.AMOUNT, "300000", null), new BigDecimal("200000")))
                .isEqualByComparingTo("200000");
        assertThat(VoucherService.discount(voucher(Voucher.AMOUNT, "300000", null), new BigDecimal("5000000")))
                .isEqualByComparingTo("300000");
    }

    @Test
    void freeShippingGivesNoGoodsDiscount() {
        assertThat(VoucherService.discount(voucher(Voucher.FREE_SHIPPING, "0", null), new BigDecimal("5000000")))
                .isEqualByComparingTo("0");
    }
}
