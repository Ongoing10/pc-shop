package com.pcshop.ai.rag;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.pcshop.events.Events;
import io.smallrye.common.annotation.Blocking;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import org.eclipse.microprofile.reactive.messaging.Incoming;

/**
 * Giữ kho tri thức khớp với catalog. Không cần processed_events:
 * product.updated đọc lại sản phẩm hiện tại và bỏ qua nếu content_hash không đổi; product.hidden gỡ lại cái đã gỡ
 * thì không làm gì. Nhận trùng hay sai thứ tự đều cho cùng kết quả.
 */
@ApplicationScoped
public class ProductEventConsumer {

    @Inject
    ProductIndexer indexer;

    @Inject
    ObjectMapper mapper;

    @Incoming("product-updated")
    @Blocking
    public void onUpdated(String json) throws Exception {
        indexer.reindex(mapper.readValue(json, Events.ProductUpdated.class).sku());
    }

    @Incoming("product-hidden")
    @Blocking
    public void onHidden(String json) throws Exception {
        indexer.remove(mapper.readValue(json, Events.ProductHidden.class).sku());
    }
}
