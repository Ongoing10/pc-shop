package com.pcshop.ordering.payment;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Khối pcshop.payment trong application.yml.
 *
 * @param publicBaseUrl địa chỉ trình duyệt dùng để gọi backend (gateway), để dựng URL return / trang giả lập
 * @param frontendReturnUrl trang kết quả của frontend; backend redirect về đây kèm ?orderCode=&result=success|failed
 * @param mockEnabled bật cổng giả lập khi chưa có khóa VNPay (KHÔNG bật khi chạy thật: ai cũng tự báo "đã trả" được)
 */
@ConfigurationProperties(prefix = "pcshop.payment")
public record PaymentProperties(String publicBaseUrl, String frontendReturnUrl, boolean mockEnabled, Vnpay vnpay) {

    /** Khóa lấy từ .env (VNPAY_TMN_CODE, VNPAY_HASH_SECRET); để trống = chưa cấu hình VNPay. */
    public record Vnpay(String tmnCode, String hashSecret, String payUrl) {

        public boolean configured() {
            return tmnCode != null && !tmnCode.isBlank() && hashSecret != null && !hashSecret.isBlank();
        }
    }

    public PaymentProperties {
        publicBaseUrl = publicBaseUrl == null ? "http://localhost:8000" : publicBaseUrl;
        frontendReturnUrl = frontendReturnUrl == null ? "http://localhost:3000/orders/payment-result" : frontendReturnUrl;
        vnpay = vnpay == null ? new Vnpay(null, null, null) : vnpay;
    }
}
