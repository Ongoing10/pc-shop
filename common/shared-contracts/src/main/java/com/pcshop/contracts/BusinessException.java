package com.pcshop.contracts;

/**
 * Lỗi nghiệp vụ. Ném ở bất kỳ service nào; exception handler của từng framework
 * (common-webflux / common-quarkus) chuyển thành {@link ResponseData} với HTTP status của {@link ErrorCode}.
 */
public class BusinessException extends RuntimeException {

    private final ErrorCode code;

    /** Chi tiết đi kèm, trả ở trường {@code data} của response lỗi (vd danh sách dòng lỗi của API hàng loạt). */
    private final Object details;

    public BusinessException(ErrorCode code, String message) {
        this(code, message, null);
    }

    public BusinessException(ErrorCode code, String message, Object details) {
        super(message);
        this.code = code;
        this.details = details;
    }

    public ErrorCode code() {
        return code;
    }

    public Object details() {
        return details;
    }

    public static BusinessException notFound(String what, Object id) {
        return new BusinessException(ErrorCode.NOT_FOUND, "Không tìm thấy " + what + ": " + id);
    }

    public static BusinessException forbidden(String message) {
        return new BusinessException(ErrorCode.FORBIDDEN, message);
    }
}
