package com.pcshop.inventory;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.LocalDateTime;

/**
 * Hàng đang giữ cho một đơn ở một kho (một bước của Saga đặt hàng). Một dòng đơn có thể chia ra nhiều kho.
 * HOLD → CONFIRMED (đơn bắt đầu giao, đã trừ kho) hoặc RELEASED (đơn hủy). EXPIRED dành cho hạn giữ hàng,
 * hiện chưa dùng: hạn thanh toán do ordering quản lý và hủy đơn qua order.cancelled.
 */
@Entity
@Table(name = "stock_reservations")
public class StockReservation {

    public static final int HOLD = 1;
    public static final int CONFIRMED = 2;
    public static final int RELEASED = 3;
    public static final int EXPIRED = 4;

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    public Long id;

    @Column(name = "order_code")
    public String orderCode;

    public String sku;

    @Column(name = "warehouse_id")
    public Long warehouseId;

    public int quantity;

    /** 1-HOLD, 2-CONFIRMED, 3-RELEASED, 4-EXPIRED */
    public int status;

    @Column(name = "expires_at")
    public LocalDateTime expiresAt;

    @Column(name = "created_at")
    public LocalDateTime createdAt;

    @Column(name = "updated_at")
    public LocalDateTime updatedAt;
}
