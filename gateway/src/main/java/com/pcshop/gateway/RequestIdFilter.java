package com.pcshop.gateway;

import org.springframework.cloud.gateway.filter.GatewayFilterChain;
import org.springframework.cloud.gateway.filter.GlobalFilter;
import org.springframework.core.Ordered;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;

import java.util.UUID;

/**
 * Gắn X-Request-Id cho mọi request đi qua gateway (giữ nguyên nếu client đã gửi),
 * chuyển tiếp cho service phía sau và trả lại trong response để tra log theo một mã.
 */
@Component
public class RequestIdFilter implements GlobalFilter, Ordered {

    public static final String HEADER = "X-Request-Id";

    @Override
    public Mono<Void> filter(ServerWebExchange exchange, GatewayFilterChain chain) {
        String incoming = exchange.getRequest().getHeaders().getFirst(HEADER);
        String requestId = StringUtils.hasText(incoming) && incoming.length() <= 64
                ? incoming
                : UUID.randomUUID().toString();
        ServerWebExchange mutated = exchange.mutate()
                .request(r -> r.headers(h -> h.set(HEADER, requestId)))
                .build();
        // Đặt lúc sắp gửi response: service phía sau cũng trả X-Request-Id, gateway chép header của nó sang
        // nên đặt sớm sẽ thành 2 giá trị trùng nhau; set ở beforeCommit ghi đè còn đúng một.
        mutated.getResponse().beforeCommit(() -> {
            mutated.getResponse().getHeaders().set(HEADER, requestId);
            return Mono.empty();
        });
        return chain.filter(mutated);
    }

    @Override
    public int getOrder() {
        return Ordered.HIGHEST_PRECEDENCE;
    }
}
