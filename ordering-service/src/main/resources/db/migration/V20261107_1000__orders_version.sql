-- Optimistic lock cho orders: nhân viên đổi trạng thái và khách tự hủy cùng lúc (sau này thêm consumer Saga)
-- thì lần ghi sau báo 409 thay vì đè lên lần ghi trước. Spring Data R2DBC tự tăng qua @Version.
ALTER TABLE orders ADD COLUMN version BIGINT NOT NULL DEFAULT 0;
