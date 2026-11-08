package com.pcshop.ordering.payment;

import com.fasterxml.jackson.annotation.JsonIgnore;
import io.r2dbc.postgresql.codec.Json;
import org.springframework.data.annotation.Id;
import org.springframework.data.relational.core.mapping.Table;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Bảng ordering.payments: mỗi lần khách bấm "Thanh toán" là một dòng (payment_code = vnp_TxnRef gửi cổng).
 * Đơn COD hoàn tất cũng có một dòng (method 1, SUCCESS) để đối soát và hoàn tiền khi trả hàng.
 * KHÔNG xóa (dữ liệu đối soát).
 */
@Table("payments")
public class Payment {

    public static final int PENDING = 1;
    public static final int SUCCESS = 2;
    public static final int FAILED = 3;
    public static final int EXPIRED = 4;
    public static final int REFUNDED = 5;

    @Id
    private Long id;
    private Long orderId;
    private String paymentCode;
    /** 1-COD, 2-VNPAY, 3-MOMO (giống Order.paymentMethod) */
    private Integer method;
    private BigDecimal amount;
    /** 1-PENDING, 2-SUCCESS, 3-FAILED, 4-EXPIRED, 5-REFUNDED */
    private Integer status;
    private String providerTransactionId;
    private String bankCode;
    private LocalDateTime paidAt;
    private LocalDateTime expiredAt;
    /** Tham số cổng thanh toán gửi về (giữ nguyên để đối soát), không trả cho client. */
    @JsonIgnore
    private Json rawResponse;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getOrderId() { return orderId; }
    public void setOrderId(Long orderId) { this.orderId = orderId; }
    public String getPaymentCode() { return paymentCode; }
    public void setPaymentCode(String paymentCode) { this.paymentCode = paymentCode; }
    public Integer getMethod() { return method; }
    public void setMethod(Integer method) { this.method = method; }
    public BigDecimal getAmount() { return amount; }
    public void setAmount(BigDecimal amount) { this.amount = amount; }
    public Integer getStatus() { return status; }
    public void setStatus(Integer status) { this.status = status; }
    public String getProviderTransactionId() { return providerTransactionId; }
    public void setProviderTransactionId(String providerTransactionId) { this.providerTransactionId = providerTransactionId; }
    public String getBankCode() { return bankCode; }
    public void setBankCode(String bankCode) { this.bankCode = bankCode; }
    public LocalDateTime getPaidAt() { return paidAt; }
    public void setPaidAt(LocalDateTime paidAt) { this.paidAt = paidAt; }
    public LocalDateTime getExpiredAt() { return expiredAt; }
    public void setExpiredAt(LocalDateTime expiredAt) { this.expiredAt = expiredAt; }
    public Json getRawResponse() { return rawResponse; }
    public void setRawResponse(Json rawResponse) { this.rawResponse = rawResponse; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
}
