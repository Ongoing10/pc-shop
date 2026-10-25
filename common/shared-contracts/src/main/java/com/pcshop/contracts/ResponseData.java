package com.pcshop.contracts;

import com.fasterxml.jackson.annotation.JsonProperty;

/**
 * Envelope chung cho MỌI response của hệ thống (Spring lẫn Quarkus):
 * <pre>{"error_status": 1, "error_message": null, "error_code": null, "data": {...}}</pre>
 * error_status: 1 = thành công, 0 = lỗi.
 */
public record ResponseData<T>(
        @JsonProperty("error_status") int errorStatus,
        @JsonProperty("error_message") String errorMessage,
        @JsonProperty("error_code") String errorCode,
        @JsonProperty("data") T data) {

    public static final int SUCCESS = 1;
    public static final int ERROR = 0;

    public static <T> ResponseData<T> success(T data) {
        return new ResponseData<>(SUCCESS, null, null, data);
    }

    public static <T> ResponseData<T> error(ErrorCode code, String message) {
        return new ResponseData<>(ERROR, message, code.name(), null);
    }
}
