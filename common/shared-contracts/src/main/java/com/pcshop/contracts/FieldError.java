package com.pcshop.contracts;

/**
 * Một lỗi kiểm tra dữ liệu, trả ở trường {@code data} của response VALIDATION_ERROR (cả Spring lẫn Quarkus).
 *
 * @param field đường dẫn trường trong body/tham số, vd {@code receiverPhone}, {@code lines[0].quantity}
 */
public record FieldError(String field, String message) {
}
