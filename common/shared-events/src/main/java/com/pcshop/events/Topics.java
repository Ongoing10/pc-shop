package com.pcshop.events;

/** Tên topic Kafka. Đặt một chỗ để producer và consumer không gõ sai. */
public final class Topics {

    private Topics() {
    }

    public static final String PRODUCT_UPDATED = "product.updated";
    public static final String PRODUCT_HIDDEN = "product.hidden";

    public static final String ORDER_CREATED = "order.created";
    public static final String ORDER_CANCELLED = "order.cancelled";

    public static final String STOCK_RESERVED = "stock.reserved";
    public static final String STOCK_RESERVE_FAILED = "stock.reserve-failed";

    public static final String PAYMENT_SUCCEEDED = "payment.succeeded";
    public static final String PAYMENT_FAILED = "payment.failed";
}
