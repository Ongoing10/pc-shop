package com.pcshop.common.webflux.web;

import com.pcshop.contracts.BusinessException;
import com.pcshop.contracts.ErrorCode;
import com.pcshop.contracts.FieldError;
import com.pcshop.contracts.ResponseData;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.dao.OptimisticLockingFailureException;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.bind.support.WebExchangeBindException;
import org.springframework.web.method.annotation.HandlerMethodValidationException;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.server.ServerWebExchange;
import org.springframework.web.server.ServerWebInputException;

import java.util.Comparator;
import java.util.List;
import java.util.stream.Collectors;

/** Mọi lỗi đều trả về envelope {@link ResponseData}, giống phía Quarkus. */
@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    @ExceptionHandler(BusinessException.class)
    public ResponseEntity<ResponseData<Object>> business(BusinessException ex) {
        return ResponseEntity.status(ex.code().httpStatus())
                .body(ResponseData.error(ex.code(), ex.getMessage(), ex.details()));
    }

    /** data = [{field, message}] giống phía Quarkus (ValidationExceptionMapper) để frontend gắn lỗi vào ô form. */
    @ExceptionHandler(WebExchangeBindException.class)
    public ResponseEntity<ResponseData<Object>> validation(WebExchangeBindException ex) {
        List<FieldError> errors = ex.getFieldErrors().stream()
                .map(e -> new FieldError(e.getField(), e.getDefaultMessage()))
                .sorted(Comparator.comparing(FieldError::field))
                .toList();
        String message = errors.stream().map(e -> e.field() + ": " + e.message()).collect(Collectors.joining(", "));
        return ResponseEntity.status(ErrorCode.VALIDATION_ERROR.httpStatus())
                .body(ResponseData.error(ErrorCode.VALIDATION_ERROR, message, errors));
    }

    /** Ràng buộc trên @RequestParam/@PathVariable (Spring 6.1+), không có thì rơi xuống 500. */
    @ExceptionHandler(HandlerMethodValidationException.class)
    public ResponseEntity<ResponseData<Object>> methodValidation(HandlerMethodValidationException ex) {
        List<FieldError> errors = ex.getParameterValidationResults().stream()
                .flatMap(r -> r.getResolvableErrors().stream().map(e -> new FieldError(
                        r.getMethodParameter().getParameterName(), e.getDefaultMessage())))
                .toList();
        String message = errors.stream().map(e -> e.field() + ": " + e.message()).collect(Collectors.joining(", "));
        return ResponseEntity.status(ErrorCode.VALIDATION_ERROR.httpStatus())
                .body(ResponseData.error(ErrorCode.VALIDATION_ERROR, message, errors));
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

    /** Vi phạm unique index/constraint mà service chưa tự kiểm tra trước: báo xung đột thay vì 500. */
    @ExceptionHandler(DuplicateKeyException.class)
    public ResponseEntity<ResponseData<Void>> duplicate(DuplicateKeyException ex, ServerWebExchange exchange) {
        log.warn("Duplicate key [{}] {} {}: {}", RequestIdWebFilter.requestId(exchange),
                exchange.getRequest().getMethod(), exchange.getRequest().getPath(), ex.getMostSpecificCause().getMessage());
        return build(ErrorCode.CONFLICT, "Dữ liệu đã tồn tại");
    }

    @ExceptionHandler(ResponseStatusException.class)
    public ResponseEntity<ResponseData<Void>> status(ResponseStatusException ex) {
        return ResponseEntity.status(ex.getStatusCode())
                .body(new ResponseData<>(ResponseData.ERROR, ex.getReason(), String.valueOf(ex.getStatusCode().value()), null));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ResponseData<Void>> unexpected(Exception ex, ServerWebExchange exchange) {
        log.error("Unexpected error [{}] {} {}", RequestIdWebFilter.requestId(exchange),
                exchange.getRequest().getMethod(), exchange.getRequest().getPath(), ex);
        return build(ErrorCode.INTERNAL_ERROR, "Lỗi hệ thống");   // không lộ chi tiết nội bộ
    }

    private static ResponseEntity<ResponseData<Void>> build(ErrorCode code, String message) {
        return ResponseEntity.status(code.httpStatus()).body(ResponseData.error(code, message));
    }
}
