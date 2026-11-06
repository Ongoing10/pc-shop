package com.pcshop.common.quarkus;

import jakarta.ws.rs.container.ContainerRequestContext;
import jakarta.ws.rs.container.ContainerRequestFilter;
import jakarta.ws.rs.container.ContainerResponseContext;
import jakarta.ws.rs.container.ContainerResponseFilter;
import jakarta.ws.rs.container.PreMatching;
import jakarta.ws.rs.ext.Provider;
import org.jboss.logging.Logger;
import org.jboss.logging.MDC;

import java.util.UUID;

/**
 * Đọc X-Request-Id do gateway gắn (gọi thẳng service thì tự sinh), đặt vào MDC để mọi dòng log
 * của request có mã này (format log ở META-INF/microprofile-config.properties), trả lại trong response.
 */
@Provider
@PreMatching
public class RequestIdFilter implements ContainerRequestFilter, ContainerResponseFilter {

    public static final String HEADER = "X-Request-Id";
    private static final String MDC_KEY = "requestId";
    private static final String START = RequestIdFilter.class.getName() + ".start";
    private static final Logger log = Logger.getLogger(RequestIdFilter.class);

    @Override
    public void filter(ContainerRequestContext request) {
        String incoming = request.getHeaderString(HEADER);
        String requestId = incoming != null && !incoming.isBlank() && incoming.length() <= 64
                ? incoming
                : UUID.randomUUID().toString();
        MDC.put(MDC_KEY, requestId);
        request.setProperty(MDC_KEY, requestId);
        request.setProperty(START, System.currentTimeMillis());
    }

    @Override
    public void filter(ContainerRequestContext request, ContainerResponseContext response) {
        Object requestId = request.getProperty(MDC_KEY);
        if (requestId == null) {
            return;
        }
        response.getHeaders().putSingle(HEADER, requestId);
        Object start = request.getProperty(START);
        String path = request.getUriInfo().getPath();
        if (start instanceof Long begin && !path.startsWith("/q/")) {
            log.infof("%s %s -> %d (%d ms)", request.getMethod(), path, response.getStatus(),
                    System.currentTimeMillis() - begin);
        }
        MDC.remove(MDC_KEY);
    }
}
