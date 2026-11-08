package com.pcshop.ordering.order;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.pcshop.ordering.common.AuditableEntity;
import org.springframework.data.annotation.Id;
import org.springframework.data.annotation.Version;
import org.springframework.data.relational.core.mapping.Table;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

/** Bảng ordering.orders. KHÔNG BAO GIỜ XÓA: hủy đơn = status CANCELLED. */
@Table("orders")
public class Order extends AuditableEntity {

    public static final int PENDING = 1;
    public static final int AWAITING_PAYMENT = 2;
    public static final int PAID = 3;
    public static final int CONFIRMED = 4;
    public static final int SHIPPING = 5;
    public static final int COMPLETED = 6;
    public static final int CANCELLED = 7;
    public static final int RETURNED = 8;

    public static final int PAYMENT_COD = 1;
    public static final int PAYMENT_VNPAY = 2;
    public static final int PAYMENT_STATUS_UNPAID = 1;
    public static final int PAYMENT_STATUS_PAID = 2;
    public static final int PAYMENT_STATUS_REFUNDED = 3;

    @Id
    private Long id;
    private String code;
    /** sub của Keycloak */
    private UUID userId;
    /** 1-PENDING, 2-AWAITING_PAYMENT, 3-PAID, 4-CONFIRMED, 5-SHIPPING, 6-COMPLETED, 7-CANCELLED, 8-RETURNED */
    private Integer status;
    /** 1-COD, 2-VNPAY, 3-MOMO */
    private Integer paymentMethod;
    /** 1-UNPAID, 2-PAID, 3-REFUNDED */
    private Integer paymentStatus;
    private BigDecimal subtotalAmount;
    private BigDecimal discountAmount;
    private BigDecimal shippingFee;
    private BigDecimal totalAmount;
    private String voucherCode;
    /** Email người đặt (từ token lúc đặt), dùng gửi email thông báo. */
    private String customerEmail;
    private String receiverName;
    private String receiverPhone;
    private String shippingAddress;
    private String note;
    /** Tham chiếu logic: catalog.pc_builds._id */
    private String pcBuildId;
    private String cancelReason;
    private LocalDateTime placedAt;
    private LocalDateTime completedAt;
    /** Idempotency-Key của request đặt hàng (chống đặt trùng), không trả cho client. */
    @JsonIgnore
    private String requestId;

    /** Optimistic lock: hai thao tác đổi trạng thái cùng lúc thì thao tác sau nhận 409, không ghi đè. */
    @Version
    private Long version;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getCode() { return code; }
    public void setCode(String code) { this.code = code; }
    public UUID getUserId() { return userId; }
    public void setUserId(UUID userId) { this.userId = userId; }
    public Integer getStatus() { return status; }
    public void setStatus(Integer status) { this.status = status; }
    public Integer getPaymentMethod() { return paymentMethod; }
    public void setPaymentMethod(Integer paymentMethod) { this.paymentMethod = paymentMethod; }
    public Integer getPaymentStatus() { return paymentStatus; }
    public void setPaymentStatus(Integer paymentStatus) { this.paymentStatus = paymentStatus; }
    public BigDecimal getSubtotalAmount() { return subtotalAmount; }
    public void setSubtotalAmount(BigDecimal subtotalAmount) { this.subtotalAmount = subtotalAmount; }
    public BigDecimal getDiscountAmount() { return discountAmount; }
    public void setDiscountAmount(BigDecimal discountAmount) { this.discountAmount = discountAmount; }
    public BigDecimal getShippingFee() { return shippingFee; }
    public void setShippingFee(BigDecimal shippingFee) { this.shippingFee = shippingFee; }
    public BigDecimal getTotalAmount() { return totalAmount; }
    public void setTotalAmount(BigDecimal totalAmount) { this.totalAmount = totalAmount; }
    public String getVoucherCode() { return voucherCode; }
    public void setVoucherCode(String voucherCode) { this.voucherCode = voucherCode; }
    public String getCustomerEmail() { return customerEmail; }
    public void setCustomerEmail(String customerEmail) { this.customerEmail = customerEmail; }
    public String getReceiverName() { return receiverName; }
    public void setReceiverName(String receiverName) { this.receiverName = receiverName; }
    public String getReceiverPhone() { return receiverPhone; }
    public void setReceiverPhone(String receiverPhone) { this.receiverPhone = receiverPhone; }
    public String getShippingAddress() { return shippingAddress; }
    public void setShippingAddress(String shippingAddress) { this.shippingAddress = shippingAddress; }
    public String getNote() { return note; }
    public void setNote(String note) { this.note = note; }
    public String getPcBuildId() { return pcBuildId; }
    public void setPcBuildId(String pcBuildId) { this.pcBuildId = pcBuildId; }
    public String getCancelReason() { return cancelReason; }
    public void setCancelReason(String cancelReason) { this.cancelReason = cancelReason; }
    public LocalDateTime getPlacedAt() { return placedAt; }
    public void setPlacedAt(LocalDateTime placedAt) { this.placedAt = placedAt; }
    public LocalDateTime getCompletedAt() { return completedAt; }
    public void setCompletedAt(LocalDateTime completedAt) { this.completedAt = completedAt; }
    public String getRequestId() { return requestId; }
    public void setRequestId(String requestId) { this.requestId = requestId; }
    public Long getVersion() { return version; }
    public void setVersion(Long version) { this.version = version; }
}
