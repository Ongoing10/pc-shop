package com.pcshop.catalog;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.pcshop.events.Events;
import io.smallrye.common.annotation.Blocking;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import org.eclipse.microprofile.reactive.messaging.Incoming;
import org.jboss.logging.Logger;

import java.util.Date;

/**
 * Điểm sao từ review-service (review.stats-changed): ghi đè rating_avg / rating_count bằng số tổng mới nhất.
 * Không cần processed_events: ghi đè cùng giá trị là vô hại, bản cũ hơn bị bỏ qua (ProductRepository.updateRating).
 */
@ApplicationScoped
public class RatingConsumer {

    private static final Logger LOG = Logger.getLogger(RatingConsumer.class);

    @Inject
    CatalogRepositories.ProductRepository products;

    @Inject
    ObjectMapper mapper;

    @Incoming("review-stats-changed")
    @Blocking
    public void onStatsChanged(String json) throws JsonProcessingException {
        Events.ReviewStatsChanged event = mapper.readValue(json, Events.ReviewStatsChanged.class);
        boolean updated = products.updateRating(event.productId(), event.average(), event.count(),
                Date.from(event.computedAt()));
        if (!updated) {
            LOG.debugf("Bỏ qua điểm sao của %s (không có sản phẩm hoặc bản cũ hơn)", event.productId());
        }
    }
}
