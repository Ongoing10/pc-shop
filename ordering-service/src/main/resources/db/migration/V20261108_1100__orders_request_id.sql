-- Chống đặt trùng: POST /orders gửi header Idempotency-Key, cùng user + cùng key thì trả lại đơn đã tạo.
ALTER TABLE orders ADD COLUMN request_id VARCHAR(64);
CREATE UNIQUE INDEX uk_orders_user_request ON orders (user_id, request_id) WHERE request_id IS NOT NULL;
