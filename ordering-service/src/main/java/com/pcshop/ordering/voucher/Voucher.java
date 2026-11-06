package com.pcshop.ordering.voucher;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.pcshop.ordering.common.AuditableEntity;
import io.r2dbc.postgresql.codec.Json;
import org.springframework.data.annotation.Id;
import org.springframework.data.annotation.Version;
import org.springframework.data.relational.core.mapping.Table;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/** Bảng ordering.vouchers (schema lấy từ search_path của kết nối). Không xóa: ngừng dùng = is_active 0. */
@Table("vouchers")
public class Voucher extends AuditableEntity {

    public static final int PERCENT = 1;
    public static final int AMOUNT = 2;
    public static final int FREE_SHIPPING = 3;

    @Id
    private Long id;
    private String code;
    private String name;
    /** 1-Giảm %, 2-Giảm số tiền, 3-Miễn phí vận chuyển */
    private Integer type;
    private BigDecimal value;
    private BigDecimal maxDiscountAmount;
    private BigDecimal minOrderAmount;
    /** Cột JSONB: mảng mã danh mục được áp dụng, null/rỗng = mọi danh mục. Đọc/ghi qua VoucherService. */
    private Json applicableCategories;
    private Integer usageLimit;
    private Integer usedCount;
    private Integer perUserLimit;
    private LocalDateTime startAt;
    private LocalDateTime endAt;
    private Integer isActive;

    /** Optimistic lock: nhiều đơn cùng dùng voucher thì used_count không bị ghi đè (409). */
    @Version
    private Long version;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getCode() { return code; }
    public void setCode(String code) { this.code = code; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public Integer getType() { return type; }
    public void setType(Integer type) { this.type = type; }
    public BigDecimal getValue() { return value; }
    public void setValue(BigDecimal value) { this.value = value; }
    public BigDecimal getMaxDiscountAmount() { return maxDiscountAmount; }
    public void setMaxDiscountAmount(BigDecimal maxDiscountAmount) { this.maxDiscountAmount = maxDiscountAmount; }
    public BigDecimal getMinOrderAmount() { return minOrderAmount; }
    public void setMinOrderAmount(BigDecimal minOrderAmount) { this.minOrderAmount = minOrderAmount; }
    @JsonIgnore
    public Json getApplicableCategories() { return applicableCategories; }
    public void setApplicableCategories(Json applicableCategories) { this.applicableCategories = applicableCategories; }
    public Integer getUsageLimit() { return usageLimit; }
    public void setUsageLimit(Integer usageLimit) { this.usageLimit = usageLimit; }
    public Integer getUsedCount() { return usedCount; }
    public void setUsedCount(Integer usedCount) { this.usedCount = usedCount; }
    public Integer getPerUserLimit() { return perUserLimit; }
    public void setPerUserLimit(Integer perUserLimit) { this.perUserLimit = perUserLimit; }
    public LocalDateTime getStartAt() { return startAt; }
    public void setStartAt(LocalDateTime startAt) { this.startAt = startAt; }
    public LocalDateTime getEndAt() { return endAt; }
    public void setEndAt(LocalDateTime endAt) { this.endAt = endAt; }
    public Integer getIsActive() { return isActive; }
    public void setIsActive(Integer isActive) { this.isActive = isActive; }
    public Long getVersion() { return version; }
    public void setVersion(Long version) { this.version = version; }
}
