package com.pcshop.ordering.order;

import com.pcshop.ordering.checkout.CheckoutClients;
import org.springframework.data.annotation.Id;
import org.springframework.data.relational.core.mapping.Table;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/** Bảng ordering.order_items: snapshot sản phẩm lúc đặt (tên, giá, ảnh), không đổi theo catalog. */
@Table("order_items")
public class OrderItem {

    @Id
    private Long id;
    private Long orderId;
    private String productId;
    private String sku;
    private String productName;
    private String productImageUrl;
    private String categoryCode;
    private BigDecimal unitPrice;
    private Integer quantity;
    private BigDecimal discountAmount;
    private BigDecimal lineTotal;
    private Integer warrantyMonths;
    private LocalDateTime createdAt;

    /** Dòng đơn từ một dòng giỏ hàng (giá, tên, ảnh lấy tại thời điểm đặt). */
    public static OrderItem of(Order order, CheckoutClients.CartLine line) {
        OrderItem item = new OrderItem();
        item.orderId = order.getId();
        item.productId = line.productId();
        item.sku = line.sku();
        item.productName = line.name();
        item.productImageUrl = line.imageUrl();
        item.categoryCode = line.categoryCode();
        item.unitPrice = line.unitPrice();
        item.quantity = line.quantity();
        item.discountAmount = BigDecimal.ZERO;
        item.lineTotal = line.lineTotal();
        item.warrantyMonths = line.warrantyMonths();
        item.createdAt = LocalDateTime.now();
        return item;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getOrderId() { return orderId; }
    public void setOrderId(Long orderId) { this.orderId = orderId; }
    public String getProductId() { return productId; }
    public void setProductId(String productId) { this.productId = productId; }
    public String getSku() { return sku; }
    public void setSku(String sku) { this.sku = sku; }
    public String getProductName() { return productName; }
    public void setProductName(String productName) { this.productName = productName; }
    public String getProductImageUrl() { return productImageUrl; }
    public void setProductImageUrl(String productImageUrl) { this.productImageUrl = productImageUrl; }
    public String getCategoryCode() { return categoryCode; }
    public void setCategoryCode(String categoryCode) { this.categoryCode = categoryCode; }
    public BigDecimal getUnitPrice() { return unitPrice; }
    public void setUnitPrice(BigDecimal unitPrice) { this.unitPrice = unitPrice; }
    public Integer getQuantity() { return quantity; }
    public void setQuantity(Integer quantity) { this.quantity = quantity; }
    public BigDecimal getDiscountAmount() { return discountAmount; }
    public void setDiscountAmount(BigDecimal discountAmount) { this.discountAmount = discountAmount; }
    public BigDecimal getLineTotal() { return lineTotal; }
    public void setLineTotal(BigDecimal lineTotal) { this.lineTotal = lineTotal; }
    public Integer getWarrantyMonths() { return warrantyMonths; }
    public void setWarrantyMonths(Integer warrantyMonths) { this.warrantyMonths = warrantyMonths; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}
