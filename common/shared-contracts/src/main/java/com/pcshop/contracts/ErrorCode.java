package com.pcshop.contracts;

/**
 * Mã lỗi dùng chung, kèm HTTP status tương ứng. Thêm mã mới ở đây để cả hai framework dùng chung.
 */
public enum ErrorCode {
    VALIDATION_ERROR(400),
    BAD_REQUEST(400),
    UNAUTHORIZED(401),
    FORBIDDEN(403),
    NOT_FOUND(404),
    CONFLICT(409),
    OUT_OF_STOCK(409),
    VOUCHER_INVALID(422),
    EXTERNAL_SERVICE_ERROR(502),
    INTERNAL_ERROR(500);

    private final int httpStatus;

    ErrorCode(int httpStatus) {
        this.httpStatus = httpStatus;
    }

    public int httpStatus() {
        return httpStatus;
    }
}
