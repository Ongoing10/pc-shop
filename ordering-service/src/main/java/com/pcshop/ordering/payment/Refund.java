package com.pcshop.ordering.payment;

import org.springframework.data.annotation.Id;
import org.springframework.data.relational.core.mapping.Table;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Bảng ordering.refunds: yêu cầu hoàn tiền, tạo tự động khi hủy/trả đơn đã thanh toán hoặc tiền về sau khi đơn đã hủy.
 * Nhân viên hoàn tiền trên trang quản trị của cổng thanh toán (hoặc trả tiền mặt với COD) rồi đánh dấu COMPLETED.
 */
@Table("refunds")
public class Refund {

    public static final int PENDING = 1;
    public static final int COMPLETED = 2;

    @Id
    private Long id;
    private Long paymentId;
    private BigDecimal amount;
    private String reason;
    /** 1-PENDING (chờ hoàn), 2-COMPLETED (đã hoàn) */
    private Integer status;
    private String providerRefundId;
    private UUID createdBy;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getPaymentId() { return paymentId; }
    public void setPaymentId(Long paymentId) { this.paymentId = paymentId; }
    public BigDecimal getAmount() { return amount; }
    public void setAmount(BigDecimal amount) { this.amount = amount; }
    public String getReason() { return reason; }
    public void setReason(String reason) { this.reason = reason; }
    public Integer getStatus() { return status; }
    public void setStatus(Integer status) { this.status = status; }
    public String getProviderRefundId() { return providerRefundId; }
    public void setProviderRefundId(String providerRefundId) { this.providerRefundId = providerRefundId; }
    public UUID getCreatedBy() { return createdBy; }
    public void setCreatedBy(UUID createdBy) { this.createdBy = createdBy; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
}
