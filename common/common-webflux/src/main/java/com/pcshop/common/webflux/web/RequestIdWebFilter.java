package com.pcshop.common.webflux.web;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.util.StringUtils;
import org.springframework.web.server.ServerWebExchange;
import org.springframework.web.server.WebFilter;
import org.springframework.web.server.WebFilterChain;
import reactor.core.publisher.Mono;

import java.util.UUID;

/**
 * Đọc X-Request-Id do gateway gắn (gọi thẳng service thì tự sinh), trả lại trong response
 * và ghi một dòng log cho mỗi request kèm mã này.
 * WebFlux không giữ MDC qua các thread của Reactor, nên chỗ nào cần log thì lấy mã qua {@link #requestId}.
 */
@Order(Ordered.HIGHEST_PRECEDENCE)
public class RequestIdWebFilter implements WebFilter {

    public static final String HEADER = "X-Request-Id";
    private static final String ATTRIBUTE = RequestIdWebFilter.class.getName() + ".id";
    private static final Logger log = LoggerFactory.getLogger(RequestIdWebFilter.class);

    @Override
    public Mono<Void> filter(ServerWebExchange exchange, WebFilterChain chain) {
        String incoming = exchange.getRequest().getHeaders().getFirst(HEADER);
        String requestId = StringUtils.hasText(incoming) && incoming.length() <= 64
                ? incoming
                : UUID.randomUUID().toString();
        exchange.getAttributes().put(ATTRIBUTE, requestId);
        exchange.getResponse().getHeaders().set(HEADER, requestId);
        long start = System.currentTimeMillis();
        return chain.filter(exchange).doFinally(signal -> {
            String path = exchange.getRequest().getPath().value();
            if (!path.startsWith("/actuator")) {
                log.info("[{}] {} {} -> {} ({} ms)", requestId, exchange.getRequest().getMethod(), path,
                        exchange.getResponse().getStatusCode(), System.currentTimeMillis() - start);
            }
        });
    }

    /** Mã request hiện tại; "-" nếu request không đi qua filter. */
    public static String requestId(ServerWebExchange exchange) {
        Object id = exchange.getAttribute(ATTRIBUTE);
        return id == null ? "-" : id.toString();
    }
}
