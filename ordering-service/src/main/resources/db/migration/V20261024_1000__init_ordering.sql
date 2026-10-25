-- ordering-service V1. Flyway đặt search_path = ordering khi chạy file này.
-- Tham chiếu sang service khác (user, product, pc_build) chỉ là tham chiếu logic, KHÔNG có FK.
-- user_id / created_by / updated_by là UUID = sub của Keycloak.

CREATE TABLE orders (
    id                BIGSERIAL PRIMARY KEY,
    code              VARCHAR(30)    NOT NULL UNIQUE,
    user_id           UUID           NOT NULL,
    status            INTEGER        NOT NULL,          -- 1-PENDING ... 7-CANCELLED, 8-RETURNED
    payment_method    INTEGER,                          -- 1-COD, 2-VNPAY, 3-MOMO
    payment_status    INTEGER,                          -- 1-UNPAID, 2-PAID, 3-REFUNDED
    subtotal_amount   NUMERIC(15, 2) NOT NULL,
    discount_amount   NUMERIC(15, 2) NOT NULL DEFAULT 0,
    shipping_fee      NUMERIC(15, 2) NOT NULL DEFAULT 0,
    total_amount      NUMERIC(15, 2) NOT NULL,
    voucher_code      VARCHAR(50),
    receiver_name     VARCHAR(255),
    receiver_phone    VARCHAR(15),
    shipping_address  VARCHAR(500),
    note              VARCHAR(500),
    pc_build_id       VARCHAR(24),
    cancel_reason     VARCHAR(255),
    placed_at         TIMESTAMP,
    completed_at      TIMESTAMP,
    created_by        UUID,
    created_at        TIMESTAMP,
    updated_by        UUID,
    updated_at        TIMESTAMP
);
CREATE INDEX idx_orders_user_created   ON orders (user_id, created_at);
CREATE INDEX idx_orders_status_created ON orders (status, created_at);

CREATE TABLE order_items (
    id                BIGSERIAL PRIMARY KEY,
    order_id          BIGINT         NOT NULL REFERENCES orders (id),
    product_id        VARCHAR(24)    NOT NULL,
    sku               VARCHAR(50)    NOT NULL,
    product_name      VARCHAR(255)   NOT NULL,
    product_image_url VARCHAR(500),
    category_code     VARCHAR(30),
    unit_price        NUMERIC(15, 2) NOT NULL,
    quantity          INTEGER        NOT NULL CHECK (quantity > 0),
    discount_amount   NUMERIC(15, 2) NOT NULL DEFAULT 0,
    line_total        NUMERIC(15, 2) NOT NULL,
    warranty_months   INTEGER,
    created_at        TIMESTAMP
);
CREATE INDEX idx_order_items_order_id ON order_items (order_id);
CREATE INDEX idx_order_items_sku      ON order_items (sku);

CREATE TABLE order_status_histories (
    id          BIGSERIAL PRIMARY KEY,
    order_id    BIGINT  NOT NULL REFERENCES orders (id),
    from_status INTEGER,
    to_status   INTEGER NOT NULL,
    reason      VARCHAR(255),
    created_by  UUID,
    created_at  TIMESTAMP
);
CREATE INDEX idx_order_status_histories_order_id ON order_status_histories (order_id);

CREATE TABLE vouchers (
    id                    BIGSERIAL PRIMARY KEY,
    code                  VARCHAR(50)    NOT NULL UNIQUE,
    name                  VARCHAR(255),
    type                  INTEGER        NOT NULL,      -- 1-%, 2-số tiền, 3-free ship
    value                 NUMERIC(15, 2) NOT NULL,
    max_discount_amount   NUMERIC(15, 2),
    min_order_amount      NUMERIC(15, 2) DEFAULT 0,
    applicable_categories JSONB,
    usage_limit           INTEGER,
    used_count            INTEGER        NOT NULL DEFAULT 0,
    per_user_limit        INTEGER        DEFAULT 1,
    version               BIGINT         NOT NULL DEFAULT 0,
    start_at              TIMESTAMP,
    end_at                TIMESTAMP,
    is_active             INTEGER        NOT NULL DEFAULT 1,
    created_by            UUID,
    created_at            TIMESTAMP,
    updated_by            UUID,
    updated_at            TIMESTAMP
);

CREATE TABLE voucher_usages (
    id              BIGSERIAL PRIMARY KEY,
    voucher_id      BIGINT         NOT NULL REFERENCES vouchers (id),
    order_id        BIGINT         NOT NULL REFERENCES orders (id),
    user_id         UUID           NOT NULL,
    discount_amount NUMERIC(15, 2) NOT NULL,
    created_at      TIMESTAMP,
    CONSTRAINT uk_voucher_usages_voucher_order UNIQUE (voucher_id, order_id)
);
CREATE INDEX idx_voucher_usages_voucher_user ON voucher_usages (voucher_id, user_id);

CREATE TABLE payments (
    id                      BIGSERIAL PRIMARY KEY,
    order_id                BIGINT         NOT NULL REFERENCES orders (id),
    payment_code            VARCHAR(50)    NOT NULL UNIQUE,
    method                  INTEGER        NOT NULL,
    amount                  NUMERIC(15, 2) NOT NULL,
    status                  INTEGER        NOT NULL,    -- 1-PENDING, 2-SUCCESS, 3-FAILED, 4-EXPIRED, 5-REFUNDED
    provider_transaction_id VARCHAR(100),
    bank_code               VARCHAR(30),
    paid_at                 TIMESTAMP,
    expired_at              TIMESTAMP,
    raw_response            JSONB,
    created_at              TIMESTAMP,
    updated_at              TIMESTAMP
);
CREATE INDEX idx_payments_order_id ON payments (order_id);

CREATE TABLE refunds (
    id                 BIGSERIAL PRIMARY KEY,
    payment_id         BIGINT         NOT NULL REFERENCES payments (id),
    amount             NUMERIC(15, 2) NOT NULL,
    reason             VARCHAR(255),
    status             INTEGER        NOT NULL,
    provider_refund_id VARCHAR(100),
    created_by         UUID,
    created_at         TIMESTAMP,
    updated_at         TIMESTAMP
);

CREATE TABLE outbox_events (
    id             UUID PRIMARY KEY,
    aggregate_type VARCHAR(50)  NOT NULL,
    aggregate_id   VARCHAR(50)  NOT NULL,
    event_type     VARCHAR(100) NOT NULL,
    payload        JSONB        NOT NULL,
    status         INTEGER      NOT NULL DEFAULT 0,     -- 0-NEW, 1-SENT, 2-FAILED
    retry_count    INTEGER      NOT NULL DEFAULT 0,
    created_at     TIMESTAMP    NOT NULL DEFAULT now(),
    sent_at        TIMESTAMP
);
CREATE INDEX idx_ordering_outbox_status_created ON outbox_events (status, created_at);

CREATE TABLE processed_events (
    event_id     UUID PRIMARY KEY,
    consumer     VARCHAR(100) NOT NULL,
    processed_at TIMESTAMP    NOT NULL DEFAULT now()
);
