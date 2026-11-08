package com.pcshop.common.quarkus;

import com.pcshop.contracts.ErrorCode;
import com.pcshop.contracts.ResponseData;
import io.quarkus.security.ForbiddenException;
import io.quarkus.security.UnauthorizedException;
import jakarta.annotation.Priority;
import jakarta.ws.rs.Priorities;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import jakarta.ws.rs.ext.ExceptionMapper;
import jakarta.ws.rs.ext.Provider;

/**
 * @RolesAllowed/@Authenticated bị từ chối → envelope ResponseData thay cho body rỗng.
 * Token sai/hết hạn bị chặn trước khi tới JAX-RS (proactive auth) nên vẫn là 401 rỗng, giống phía Spring.
 */
public final class SecurityExceptionMappers {

    private SecurityExceptionMappers() {
    }

    @Provider
    @Priority(Priorities.USER - 100)
    public static class Forbidden implements ExceptionMapper<ForbiddenException> {

        @Override
        public Response toResponse(ForbiddenException ex) {
            return build(ErrorCode.FORBIDDEN, "Bạn không có quyền thực hiện thao tác này");
        }
    }

    @Provider
    @Priority(Priorities.USER - 100)
    public static class Unauthorized implements ExceptionMapper<UnauthorizedException> {

        @Override
        public Response toResponse(UnauthorizedException ex) {
            return build(ErrorCode.UNAUTHORIZED, "Bạn cần đăng nhập");
        }
    }

    private static Response build(ErrorCode code, String message) {
        return Response.status(code.httpStatus())
                .type(MediaType.APPLICATION_JSON)
                .entity(ResponseData.error(code, message))
                .build();
    }
}
