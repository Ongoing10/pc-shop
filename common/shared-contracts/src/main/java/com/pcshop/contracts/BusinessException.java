package com.pcshop.contracts;

/**
 * Lỗi nghiệp vụ. Ném ở bất kỳ service nào; exception handler của từng framework
 * (common-webflux / common-quarkus) chuyển thành {@link ResponseData} với HTTP status của {@link ErrorCode}.
 */
public class BusinessException extends RuntimeException {

    private final ErrorCode code;

    public BusinessException(ErrorCode code, String message) {
        super(message);
        this.code = code;
    }

    public ErrorCode code() {
        return code;
    }

    public static BusinessException notFound(String what, Object id) {
        return new BusinessException(ErrorCode.NOT_FOUND, "Không tìm thấy " + what + ": " + id);
    }

    public static BusinessException forbidden(String message) {
        return new BusinessException(ErrorCode.FORBIDDEN, message);
    }
}
