package com.pcshop.ordering.payment;

import org.junit.jupiter.api.Test;
import org.springframework.web.util.UriComponentsBuilder;

import java.math.BigDecimal;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

class VnpayClientTest {

    private final VnpayClient client = new VnpayClient();
    private final PaymentProperties.Vnpay config = new PaymentProperties.Vnpay("TESTCODE", "SECRETKEY123", null);

    /** Tham số trong URL thanh toán (đã giải mã), như VNPay sẽ gửi lại. */
    private Map<String, String> paramsOf(String url) {
        Map<String, String> params = new HashMap<>();
        UriComponentsBuilder.fromUriString(url).build().getQueryParams()
                .forEach((k, v) -> params.put(k, URLDecoder.decode(v.get(0), StandardCharsets.UTF_8)));
        return params;
    }

    @Test
    void payUrlIsSignedAndVerifiable() {
        String url = client.payUrl(config, "DH20261108001000-01", new BigDecimal("7270000"),
                "Thanh toan don hang DH20261108001000", "127.0.0.1", LocalDateTime.now().plusMinutes(15),
                "http://localhost:8000/api/v1/payments/vnpay/return");
        Map<String, String> params = paramsOf(url);
        assertThat(url).startsWith(VnpayClient.DEFAULT_PAY_URL);
        assertThat(params.get("vnp_Amount")).isEqualTo("727000000");
        assertThat(params.get("vnp_OrderInfo")).isEqualTo("Thanh toan don hang DH20261108001000");
        assertThat(client.verify(config, params)).isTrue();
    }

    @Test
    void rejectsTamperedOrMissingSignature() {
        Map<String, String> params = new HashMap<>(Map.of("vnp_TxnRef", "DH1-01", "vnp_Amount", "100000",
                "vnp_ResponseCode", "00"));
        params.put("vnp_SecureHash", client.sign("SECRETKEY123", params));
        assertThat(client.verify(config, params)).isTrue();

        Map<String, String> tampered = new HashMap<>(params);
        tampered.put("vnp_Amount", "100");
        assertThat(client.verify(config, tampered)).isFalse();

        Map<String, String> otherSecret = new HashMap<>(params);
        otherSecret.put("vnp_SecureHash", client.sign("KHAC", Map.of("vnp_TxnRef", "DH1-01")));
        assertThat(client.verify(config, otherSecret)).isFalse();

        params.remove("vnp_SecureHash");
        assertThat(client.verify(config, params)).isFalse();
    }
}
