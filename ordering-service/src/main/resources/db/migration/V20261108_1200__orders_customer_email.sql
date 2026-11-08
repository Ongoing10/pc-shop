-- Email người đặt (claim email trong token lúc đặt), để notification-service gửi email theo trạng thái đơn.
-- Snapshot như receiver_*: khách đổi email sau khi đặt thì đơn cũ vẫn gửi về email cũ. Đơn seed để NULL (không gửi).
ALTER TABLE orders ADD COLUMN customer_email VARCHAR(255);
