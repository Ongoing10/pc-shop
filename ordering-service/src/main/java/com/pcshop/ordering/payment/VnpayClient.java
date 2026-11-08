package com.pcshop.ordering.payment;

import org.springframework.stereotype.Component;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.math.BigDecimal;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.security.MessageDigest;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.time.format.DateTimeFormatter;
import java.util.HexFormat;
import java.util.Map;
import java.util.TreeMap;
import java.util.stream.Collectors;

/**
 * VNPay API 2.1.0: dựng URL thanh toán và kiểm chữ ký dữ liệu trả về (return URL, IPN).
 * Chữ ký = HMAC-SHA512(hashSecret, chuỗi query các tham số vnp_* sắp xếp theo tên, giá trị URL-encode US-ASCII).
 */
@Component
public class VnpayClient {

    public static final String DEFAULT_PAY_URL = "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html";
    private static final ZoneId VN = ZoneId.of("Asia/Ho_Chi_Minh");
    private static final DateTimeFormatter TIME = DateTimeFormatter.ofPattern("yyyyMMddHHmmss");

    /**
     * @param expiresAt giờ hết hạn theo giờ máy chủ (LocalDateTime của hệ thống)
     * @param returnUrl URL trình duyệt quay về sau khi thanh toán
     */
    public String payUrl(PaymentProperties.Vnpay config, String txnRef, BigDecimal amount, String orderInfo,
                         String clientIp, LocalDateTime expiresAt, String returnUrl) {
        Map<String, String> params = new TreeMap<>();
        params.put("vnp_Version", "2.1.0");
        params.put("vnp_Command", "pay");
        params.put("vnp_TmnCode", config.tmnCode());
        params.put("vnp_Amount", amount.movePointRight(2).toBigInteger().toString());
        params.put("vnp_CurrCode", "VND");
        params.put("vnp_TxnRef", txnRef);
        params.put("vnp_OrderInfo", orderInfo);
        params.put("vnp_OrderType", "other");
        params.put("vnp_Locale", "vn");
        params.put("vnp_ReturnUrl", returnUrl);
        params.put("vnp_IpAddr", clientIp == null ? "127.0.0.1" : clientIp);
        params.put("vnp_CreateDate", ZonedDateTime.now(VN).format(TIME));
        params.put("vnp_ExpireDate", expiresAt.atZone(ZoneId.systemDefault()).withZoneSameInstant(VN).format(TIME));
        String query = query(params);
        String base = config.payUrl() == null || config.payUrl().isBlank() ? DEFAULT_PAY_URL : config.payUrl();
        return base + "?" + query + "&vnp_SecureHash=" + hmac(config.hashSecret(), query);
    }

    /** Tham số VNPay gửi về có chữ ký đúng không (bỏ vnp_SecureHash, vnp_SecureHashType khỏi dữ liệu ký). */
    public boolean verify(PaymentProperties.Vnpay config, Map<String, String> received) {
        String hash = received.get("vnp_SecureHash");
        if (hash == null) {
            return false;
        }
        Map<String, String> params = new TreeMap<>();
        received.forEach((k, v) -> {
            if (k.startsWith("vnp_") && !k.equals("vnp_SecureHash") && !k.equals("vnp_SecureHashType")
                    && v != null && !v.isEmpty()) {
                params.put(k, v);
            }
        });
        String expected = hmac(config.hashSecret(), query(params));
        return MessageDigest.isEqual(expected.getBytes(StandardCharsets.US_ASCII),
                hash.toLowerCase().getBytes(StandardCharsets.US_ASCII));
    }

    /** Chữ ký cho bộ tham số (dùng cho test và trang giả lập). */
    public String sign(String hashSecret, Map<String, String> params) {
        return hmac(hashSecret, query(new TreeMap<>(params)));
    }

    private static String query(Map<String, String> sorted) {
        return sorted.entrySet().stream()
                .map(e -> encode(e.getKey()) + "=" + encode(e.getValue()))
                .collect(Collectors.joining("&"));
    }

    private static String encode(String value) {
        return URLEncoder.encode(value, StandardCharsets.US_ASCII);
    }

    private static String hmac(String secret, String data) {
        try {
            Mac mac = Mac.getInstance("HmacSHA512");
            mac.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA512"));
            return HexFormat.of().formatHex(mac.doFinal(data.getBytes(StandardCharsets.UTF_8)));
        } catch (GeneralSecurityException e) {
            throw new IllegalStateException("Không ký được dữ liệu VNPay", e);
        }
    }
}
