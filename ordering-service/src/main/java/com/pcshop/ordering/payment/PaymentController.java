package com.pcshop.ordering.payment;

import com.pcshop.common.webflux.security.CurrentUser;
import com.pcshop.contracts.BusinessException;
import com.pcshop.contracts.ResponseData;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.http.server.reactive.ServerHttpRequest;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.util.UriComponentsBuilder;
import reactor.core.publisher.Mono;

import java.math.BigDecimal;
import java.net.URI;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * Thanh toán online. Các đường dẫn /vnpay/** và /mock/** công khai (cổng thanh toán / trình duyệt gọi, không có token):
 * an toàn nhờ kiểm chữ ký VNPay; trang giả lập chỉ bật khi pcshop.payment.mock-enabled = true.
 */
@RestController
@RequestMapping("/api/v1/payments")
public class PaymentController {

    private final PaymentService service;
    private final PaymentProperties properties;
    private final VnpayClient vnpay;

    public PaymentController(PaymentService service, PaymentProperties properties, VnpayClient vnpay) {
        this.service = service;
        this.properties = properties;
        this.vnpay = vnpay;
    }

    /** Chủ đơn bắt đầu thanh toán đơn AWAITING_PAYMENT; frontend chuyển trình duyệt tới paymentUrl. */
    @PostMapping("/{orderCode}")
    public Mono<ResponseData<PaymentService.PaymentInit>> start(@PathVariable String orderCode, ServerHttpRequest request) {
        return CurrentUser.require()
                .flatMap(user -> service.start(orderCode, user, clientIp(request)))
                .map(ResponseData::success);
    }

    /** Các lần thanh toán của đơn (chủ đơn hoặc nhân viên), mới nhất trước. */
    @GetMapping("/{orderCode}")
    public Mono<ResponseData<List<Payment>>> list(@PathVariable String orderCode) {
        return CurrentUser.require()
                .flatMapMany(user -> service.listForOrder(orderCode, user))
                .collectList()
                .map(ResponseData::success);
    }

    // ------------------------------------------------------------------ VNPay

    /**
     * IPN: máy chủ VNPay gọi (server-to-server) để báo kết quả. Trả đúng định dạng VNPay yêu cầu, KHÔNG bọc ResponseData.
     * Chạy trên máy cá nhân thì VNPay không gọi tới được localhost: kết quả được ghi qua return URL bên dưới.
     */
    @GetMapping("/vnpay/ipn")
    public Mono<Map<String, String>> ipn(@RequestParam Map<String, String> params) {
        if (!properties.vnpay().configured() || !vnpay.verify(properties.vnpay(), params)) {
            return Mono.just(ipnResponse("97", "Invalid signature"));
        }
        return completeVnpay(params).map(result -> switch (result.outcome()) {
            case NOT_FOUND -> ipnResponse("01", "Order not found");
            case AMOUNT_MISMATCH -> ipnResponse("04", "Invalid amount");
            case ALREADY_PROCESSED -> ipnResponse("02", "Order already confirmed");
            default -> ipnResponse("00", "Confirm Success");
        });
    }

    /** Trình duyệt quay về sau khi thanh toán: kiểm chữ ký, ghi kết quả (nếu IPN chưa ghi), chuyển về trang của frontend. */
    @GetMapping("/vnpay/return")
    public Mono<ResponseEntity<Void>> vnpayReturn(@RequestParam Map<String, String> params) {
        if (!properties.vnpay().configured() || !vnpay.verify(properties.vnpay(), params)) {
            return Mono.just(redirect(null, "invalid"));
        }
        return completeVnpay(params).map(result -> redirect(result.orderCode(), resultParam(result, params)));
    }

    private Mono<PaymentService.CompleteResult> completeVnpay(Map<String, String> params) {
        boolean success = "00".equals(params.get("vnp_ResponseCode")) && "00".equals(params.get("vnp_TransactionStatus"));
        BigDecimal amount = params.get("vnp_Amount") == null ? null : new BigDecimal(params.get("vnp_Amount")).movePointLeft(2);
        return service.complete(params.get("vnp_TxnRef"), success, amount, params.get("vnp_TransactionNo"),
                params.get("vnp_BankCode"), params);
    }

    private static String resultParam(PaymentService.CompleteResult result, Map<String, String> params) {
        return switch (result.outcome()) {
            case PAID -> "success";
            case ALREADY_PROCESSED -> "00".equals(params.get("vnp_ResponseCode")) ? "success" : "failed";
            case REFUND_PENDING -> "refund";
            case NOT_FOUND, AMOUNT_MISMATCH -> "invalid";
            default -> "failed";
        };
    }

    private static Map<String, String> ipnResponse(String code, String message) {
        return Map.of("RspCode", code, "Message", message);
    }

    // ------------------------------------------------------------------ Cổng giả lập (chạy local khi chưa có khóa VNPay)

    @GetMapping(value = "/mock/{paymentCode}", produces = MediaType.TEXT_HTML_VALUE)
    public Mono<String> mockPage(@PathVariable String paymentCode) {
        requireMock();
        String base = "/api/v1/payments/mock/" + paymentCode + "/complete?result=";
        return Mono.just("""
                <!doctype html><html lang="vi"><head><meta charset="utf-8"><title>Cổng thanh toán giả lập</title></head>
                <body style="font-family:sans-serif;max-width:480px;margin:40px auto">
                <h2>Cổng thanh toán giả lập</h2>
                <p>Lần thanh toán <b>%s</b>. Chỉ dùng khi phát triển (chưa cấu hình VNPay).</p>
                <p><a href="%s">Thanh toán thành công</a> · <a href="%s">Thanh toán thất bại</a></p>
                </body></html>""".formatted(paymentCode.replaceAll("[^A-Za-z0-9-]", ""), base + "success", base + "failed"));
    }

    @GetMapping("/mock/{paymentCode}/complete")
    public Mono<ResponseEntity<Void>> mockComplete(@PathVariable String paymentCode, @RequestParam String result) {
        requireMock();
        boolean success = "success".equals(result);
        return service.complete(paymentCode, success, null, success ? "MOCK-" + System.currentTimeMillis() : null,
                        "MOCK", Map.of("gateway", "MOCK", "result", result))
                .map(r -> redirect(r.orderCode(), switch (r.outcome()) {
                    case PAID -> "success";
                    case REFUND_PENDING -> "refund";
                    case NOT_FOUND -> "invalid";
                    default -> success ? "success" : "failed";
                }));
    }

    private void requireMock() {
        if (!properties.mockEnabled()) {
            throw BusinessException.notFound("trang", "thanh toán giả lập");
        }
    }

    // ------------------------------------------------------------------

    private ResponseEntity<Void> redirect(String orderCode, String result) {
        URI uri = UriComponentsBuilder.fromUriString(properties.frontendReturnUrl())
                .queryParamIfPresent("orderCode", Optional.ofNullable(orderCode))
                .queryParam("result", result)
                .build().toUri();
        return ResponseEntity.status(HttpStatus.FOUND).location(uri).build();
    }

    /** IP trình duyệt (gateway gắn X-Forwarded-For), VNPay yêu cầu vnp_IpAddr. */
    private static String clientIp(ServerHttpRequest request) {
        String forwarded = request.getHeaders().getFirst("X-Forwarded-For");
        if (forwarded != null && !forwarded.isBlank()) {
            return forwarded.split(",")[0].trim();
        }
        return request.getRemoteAddress() == null ? null : request.getRemoteAddress().getAddress().getHostAddress();
    }
}
