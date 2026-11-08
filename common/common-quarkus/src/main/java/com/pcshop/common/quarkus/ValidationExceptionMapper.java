package com.pcshop.common.quarkus;

import com.pcshop.contracts.ErrorCode;
import com.pcshop.contracts.FieldError;
import com.pcshop.contracts.ResponseData;
import jakarta.annotation.Priority;
import jakarta.validation.ConstraintViolationException;
import jakarta.validation.ElementKind;
import jakarta.validation.Path;
import jakarta.ws.rs.Priorities;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import jakarta.ws.rs.ext.ExceptionMapper;
import jakarta.ws.rs.ext.Provider;

import java.util.Comparator;
import java.util.List;
import java.util.stream.Collectors;

/**
 * Lỗi @Valid → 400 VALIDATION_ERROR trong envelope ResponseData (giống phía Spring), thay cho
 * ConstraintViolationReport mặc định của Quarkus. {@code data} = [{field, message}], field bỏ tên method/tham số.
 */
@Provider
@Priority(Priorities.USER - 100)
public class ValidationExceptionMapper implements ExceptionMapper<ConstraintViolationException> {

    @Override
    public Response toResponse(ConstraintViolationException ex) {
        List<FieldError> errors = ex.getConstraintViolations().stream()
                .map(v -> new FieldError(field(v.getPropertyPath()), v.getMessage()))
                .sorted(Comparator.comparing(FieldError::field))
                .toList();
        String message = errors.stream().map(e -> e.field() + ": " + e.message()).collect(Collectors.joining(", "));
        return Response.status(ErrorCode.VALIDATION_ERROR.httpStatus())
                .type(MediaType.APPLICATION_JSON)
                .entity(ResponseData.error(ErrorCode.VALIDATION_ERROR, message, errors))
                .build();
    }

    /** {@code create.request.lines[0].quantity} → {@code lines[0].quantity}; lỗi ở chính tham số → tên tham số. */
    static String field(Path path) {
        StringBuilder sb = new StringBuilder();
        String parameter = null;
        for (Path.Node node : path) {
            if (node.getKind() == ElementKind.METHOD) {
                continue;
            }
            if (node.getKind() == ElementKind.PARAMETER) {
                parameter = node.getName();
                continue;
            }
            // phần tử của List/Map: chỉ số nằm ở node con, hiển thị sau tên trường cha
            if (node.isInIterable() && sb.length() > 0) {
                sb.append('[').append(node.getIndex() != null ? node.getIndex() : node.getKey()).append(']');
            }
            String name = node.getName();
            if (name != null && !name.startsWith("<")) {
                if (sb.length() > 0) {
                    sb.append('.');
                }
                sb.append(name);
            }
        }
        if (sb.length() == 0) {
            return parameter == null ? "" : parameter;
        }
        return sb.toString();
    }
}
