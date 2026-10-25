-- inventory-service V1. product_id/sku là tham chiếu logic sang catalog (MongoDB), không có FK.

CREATE TABLE warehouses (
    id         BIGSERIAL PRIMARY KEY,
    code       VARCHAR(20)  NOT NULL UNIQUE,
    name       VARCHAR(255),
    address    VARCHAR(500),
    is_active  INTEGER      NOT NULL DEFAULT 1,
    created_by UUID,
    created_at TIMESTAMP,
    updated_by UUID,
    updated_at TIMESTAMP
);

CREATE TABLE inventories (
    id                BIGSERIAL PRIMARY KEY,
    product_id        VARCHAR(24) NOT NULL,
    sku               VARCHAR(50) NOT NULL,
    warehouse_id      BIGINT      NOT NULL REFERENCES warehouses (id),
    quantity          INTEGER     NOT NULL DEFAULT 0,
    reserved_quantity INTEGER     NOT NULL DEFAULT 0,
    min_quantity      INTEGER     NOT NULL DEFAULT 0,
    version           BIGINT      NOT NULL DEFAULT 0,
    created_by        UUID,
    created_at        TIMESTAMP,
    updated_by        UUID,
    updated_at        TIMESTAMP,
    CONSTRAINT uk_inventories_sku_warehouse UNIQUE (sku, warehouse_id),
    CONSTRAINT ck_inventories_reserved CHECK (reserved_quantity >= 0 AND reserved_quantity <= quantity)
);
CREATE INDEX idx_inventories_product_id ON inventories (product_id);

CREATE TABLE stock_reservations (
    id           BIGSERIAL PRIMARY KEY,
    order_code   VARCHAR(30) NOT NULL,
    sku          VARCHAR(50) NOT NULL,
    warehouse_id BIGINT      NOT NULL REFERENCES warehouses (id),
    quantity     INTEGER     NOT NULL,
    status       INTEGER     NOT NULL,          -- 1-HOLD, 2-CONFIRMED, 3-RELEASED, 4-EXPIRED
    expires_at   TIMESTAMP,
    created_at   TIMESTAMP,
    updated_at   TIMESTAMP
);
CREATE INDEX idx_stock_reservations_order_code     ON stock_reservations (order_code);
CREATE INDEX idx_stock_reservations_status_expires ON stock_reservations (status, expires_at);

-- Chỉ thêm, không sửa
CREATE TABLE stock_movements (
    id             BIGSERIAL PRIMARY KEY,
    sku            VARCHAR(50) NOT NULL,
    warehouse_id   BIGINT      NOT NULL REFERENCES warehouses (id),
    type           INTEGER     NOT NULL,        -- 1-Nhập, 2-Xuất bán, 3-Hoàn trả, 4-Điều chỉnh
    quantity       INTEGER     NOT NULL,
    quantity_after INTEGER,
    reference_type VARCHAR(30),
    reference_code VARCHAR(50),
    note           VARCHAR(255),
    created_by     UUID,
    created_at     TIMESTAMP
);
CREATE INDEX idx_stock_movements_sku_created ON stock_movements (sku, created_at);

CREATE TABLE outbox_events (
    id             UUID PRIMARY KEY,
    aggregate_type VARCHAR(50)  NOT NULL,
    aggregate_id   VARCHAR(50)  NOT NULL,
    event_type     VARCHAR(100) NOT NULL,
    payload        JSONB        NOT NULL,
    status         INTEGER      NOT NULL DEFAULT 0,
    retry_count    INTEGER      NOT NULL DEFAULT 0,
    created_at     TIMESTAMP    NOT NULL DEFAULT now(),
    sent_at        TIMESTAMP
);
CREATE INDEX idx_inventory_outbox_status_created ON outbox_events (status, created_at);

CREATE TABLE processed_events (
    event_id     UUID PRIMARY KEY,
    consumer     VARCHAR(100) NOT NULL,
    processed_at TIMESTAMP    NOT NULL DEFAULT now()
);
