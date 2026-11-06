package com.pcshop.common.quarkus;

import com.pcshop.contracts.BusinessException;
import com.pcshop.contracts.ResponseData;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import jakarta.ws.rs.ext.ExceptionMapper;
import jakarta.ws.rs.ext.Provider;

/** BusinessException → HTTP status của ErrorCode + envelope ResponseData (giống phía Spring). */
@Provider
public class BusinessExceptionMapper implements ExceptionMapper<BusinessException> {

    @Override
    public Response toResponse(BusinessException ex) {
        return Response.status(ex.code().httpStatus())
                .type(MediaType.APPLICATION_JSON)
                .entity(ResponseData.error(ex.code(), ex.getMessage(), ex.details()))
                .build();
    }
}
