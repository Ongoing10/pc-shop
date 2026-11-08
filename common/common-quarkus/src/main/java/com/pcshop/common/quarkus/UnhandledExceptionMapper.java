package com.pcshop.common.quarkus;

import com.pcshop.contracts.ErrorCode;
import com.pcshop.contracts.ResponseData;
import jakarta.annotation.Priority;
import jakarta.ws.rs.Priorities;
import jakarta.ws.rs.WebApplicationException;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import jakarta.ws.rs.ext.ExceptionMapper;
import jakarta.ws.rs.ext.Provider;
import org.jboss.logging.Logger;

import java.sql.SQLException;

/**
 * Lỗi chưa được service bắt → envelope ResponseData (giống GlobalExceptionHandler phía Spring):
 * <ul>
 *   <li>WebApplicationException (404 sai đường dẫn, 405, 415...) giữ nguyên HTTP status</li>
 *   <li>lỗi khi gọi service khác qua REST client → 502</li>
 *   <li>xung đột optimistic lock → 409; vi phạm unique (Postgres 23505, Mongo E11000) → 409</li>
 *   <li>còn lại → 500 "Lỗi hệ thống", chi tiết chỉ ghi log</li>
 * </ul>
 * Nhận diện bằng tên lớp để thư viện này không phải phụ thuộc Hibernate/Mongo (service nào cũng dùng được).
 * Mapper cho kiểu cụ thể hơn (BusinessException, lỗi validate, lỗi JSON của Quarkus) vẫn được ưu tiên.
 */
@Provider
@Priority(Priorities.USER - 100)
public class UnhandledExceptionMapper implements ExceptionMapper<Exception> {

    private static final Logger log = Logger.getLogger(UnhandledExceptionMapper.class);

    @Override
    public Response toResponse(Exception ex) {
        if (isClientCallError(ex)) {
            log.warnf("Gọi service khác lỗi: %s", ex.toString());
            return build(ErrorCode.EXTERNAL_SERVICE_ERROR.httpStatus(), ErrorCode.EXTERNAL_SERVICE_ERROR,
                    "Service liên quan đang lỗi, thử lại sau");
        }
        if (ex instanceof WebApplicationException wae && wae.getResponse() != null) {
            int status = wae.getResponse().getStatus();
            if (status < 500) {
                String message = switch (status) {
                    case 404 -> "Không tìm thấy đường dẫn";
                    case 405 -> "Phương thức HTTP không được hỗ trợ";
                    case 415 -> "Kiểu nội dung không được hỗ trợ";
                    default -> wae.getMessage();
                };
                return build(status, codeFor(status), message);
            }
        }
        for (Throwable t = ex; t != null && t.getCause() != t; t = t.getCause()) {
            String name = t.getClass().getSimpleName();
            if (name.equals("OptimisticLockException") || name.startsWith("StaleObjectState")
                    || name.equals("StaleStateException")) {
                return build(409, ErrorCode.CONFLICT, "Dữ liệu đã bị người khác thay đổi, vui lòng tải lại");
            }
            if ((t instanceof SQLException sql && "23505".equals(sql.getSQLState()))
                    || (t.getMessage() != null && t.getMessage().contains("E11000"))) {
                log.warnf("Trùng khóa: %s", t.getMessage());
                return build(409, ErrorCode.CONFLICT, "Dữ liệu đã tồn tại");
            }
        }
        log.error("Lỗi không mong đợi", ex);
        return build(500, ErrorCode.INTERNAL_ERROR, "Lỗi hệ thống");   // không lộ chi tiết nội bộ
    }

    /** ClientWebApplicationException (REST client nhận 4xx/5xx) và lỗi kết nối tới service khác. */
    private static boolean isClientCallError(Throwable ex) {
        for (Throwable t = ex; t != null && t.getCause() != t; t = t.getCause()) {
            String name = t.getClass().getName();
            if (name.endsWith("ClientWebApplicationException") || t instanceof java.net.ConnectException) {
                return true;
            }
        }
        return false;
    }

    private static ErrorCode codeFor(int status) {
        return switch (status) {
            case 401 -> ErrorCode.UNAUTHORIZED;
            case 403 -> ErrorCode.FORBIDDEN;
            case 404 -> ErrorCode.NOT_FOUND;
            case 409 -> ErrorCode.CONFLICT;
            default -> ErrorCode.BAD_REQUEST;
        };
    }

    private static Response build(int status, ErrorCode code, String message) {
        return Response.status(status)
                .type(MediaType.APPLICATION_JSON)
                .entity(ResponseData.error(code, message))
                .build();
    }
}
