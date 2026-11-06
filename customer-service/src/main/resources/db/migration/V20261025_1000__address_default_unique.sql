-- Mỗi user tối đa MỘT địa chỉ mặc định (code service đã đảm bảo, index này chặn ở tầng DB nếu có request đồng thời).
CREATE UNIQUE INDEX uk_user_addresses_one_default ON user_addresses (user_id) WHERE is_default;
