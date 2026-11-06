package com.pcshop.excel.dto;

import java.util.Locale;

/**
 * Cách xử lý mã (SKU...) đã có trong DB khi import (guide mục 4). Khác {@link ImportMode} của base cũ:
 * {@code CREATE_ONLY} báo lỗi dòng nếu mã đã tồn tại, {@code UPSERT} thì cập nhật.
 */
public enum ImportPolicy {

    CREATE_ONLY,
    UPSERT;

    /** Trống thì {@code CREATE_ONLY}; giá trị lạ ném {@link IllegalArgumentException}. */
    public static ImportPolicy parse(String value) {
        if (value == null || value.isBlank()) {
            return CREATE_ONLY;
        }
        try {
            return valueOf(value.trim().toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException ex) {
            throw new IllegalArgumentException("mode chỉ nhận CREATE_ONLY hoặc UPSERT", ex);
        }
    }
}
