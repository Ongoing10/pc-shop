package com.pcshop.common.webflux.web;

import com.pcshop.contracts.BusinessException;
import com.pcshop.contracts.ErrorCode;
import com.pcshop.contracts.ResponseData;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.OptimisticLockingFailureException;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.bind.support.WebExchangeBindException;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.server.ServerWebInputException;

import java.util.stream.Collectors;

/** Mọi lỗi đều trả về envelope {@link ResponseData}, giống phía Quarkus. */
@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    @ExceptionHandler(BusinessException.class)
    public ResponseEntity<ResponseData<Void>> business(BusinessException ex) {
        return build(ex.code(), ex.getMessage());
    }

    @ExceptionHandler(WebExchangeBindException.class)
    public ResponseEntity<ResponseData<Void>> validation(WebExchangeBindException ex) {
        String message = ex.getFieldErrors().stream()
                .map(e -> e.getField() + ": " + e.getDefaultMessage())
                .collect(Collectors.joining(", "));
        return build(ErrorCode.VALIDATION_ERROR, message);
    }

    @ExceptionHandler(ServerWebInputException.class)
    public ResponseEntity<ResponseData<Void>> badInput(ServerWebInputException ex) {
        return build(ErrorCode.BAD_REQUEST, ex.getReason());
    }

    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<ResponseData<Void>> forbidden(AccessDeniedException ex) {
        return build(ErrorCode.FORBIDDEN, "Bạn không có quyền thực hiện thao tác này");
    }

    @ExceptionHandler(OptimisticLockingFailureException.class)
    public ResponseEntity<ResponseData<Void>> conflict(OptimisticLockingFailureException ex) {
        return build(ErrorCode.CONFLICT, "Dữ liệu đã bị người khác thay đổi, vui lòng tải lại");
    }

    @ExceptionHandler(ResponseStatusException.class)
    public ResponseEntity<ResponseData<Void>> status(ResponseStatusException ex) {
        return ResponseEntity.status(ex.getStatusCode())
                .body(new ResponseData<>(ResponseData.ERROR, ex.getReason(), String.valueOf(ex.getStatusCode().value()), null));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ResponseData<Void>> unexpected(Exception ex) {
        log.error("Unexpected error", ex);
        return build(ErrorCode.INTERNAL_ERROR, "Lỗi hệ thống");   // không lộ chi tiết nội bộ
    }

    private static ResponseEntity<ResponseData<Void>> build(ErrorCode code, String message) {
        return ResponseEntity.status(code.httpStatus()).body(ResponseData.error(code, message));
    }
}
