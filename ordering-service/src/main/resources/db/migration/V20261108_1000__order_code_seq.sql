-- Số thứ tự trong mã đơn DH<yyyyMMdd><6 số> của POST /orders. Bắt đầu từ 1000 để không trùng đơn seed (000001..000007).
CREATE SEQUENCE order_code_seq START WITH 1000;
