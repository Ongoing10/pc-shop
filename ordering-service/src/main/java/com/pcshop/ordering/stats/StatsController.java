package com.pcshop.ordering.stats;

import com.pcshop.contracts.BusinessException;
import com.pcshop.contracts.ErrorCode;
import com.pcshop.contracts.ResponseData;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.r2dbc.core.DatabaseClient;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import reactor.core.publisher.Mono;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Thống kê bán hàng cho dashboard admin, tính trực tiếp từ orders/order_items bằng SQL.
 * Khoảng ngày [from, to] theo ngày tạo đơn; mặc định 30 ngày gần nhất.
 * Doanh thu = đơn COMPLETED; doanh thu gộp = mọi đơn trừ CANCELLED/RETURNED.
 */
@RestController
@RequestMapping("/api/v1/admin/stats")
@PreAuthorize("hasAnyRole('STAFF', 'ADMIN')")
public class StatsController {

    public record Overview(LocalDate from, LocalDate to, long totalOrders, BigDecimal revenue,
                           BigDecimal grossRevenue, Map<Integer, Long> ordersByStatus) {
    }

    public record TopProduct(String sku, String productName, long quantity, BigDecimal revenue) {
    }

    private final DatabaseClient db;

    public StatsController(DatabaseClient db) {
        this.db = db;
    }

    @GetMapping("/overview")
    public Mono<ResponseData<Overview>> overview(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        LocalDate end = to == null ? LocalDate.now() : to;
        LocalDate start = from == null ? end.minusDays(29) : from;
        validateRange(start, end);
        return db.sql("""
                        SELECT status, COUNT(*) AS cnt, COALESCE(SUM(total_amount), 0) AS amount
                        FROM orders
                        WHERE created_at >= :from AND created_at < :to
                        GROUP BY status
                        ORDER BY status
                        """)
                .bind("from", start.atStartOfDay())
                .bind("to", end.plusDays(1).atStartOfDay())
                .map((row, meta) -> new Object[]{row.get("status", Integer.class), row.get("cnt", Long.class),
                        row.get("amount", BigDecimal.class)})
                .all()
                .collectList()
                .map(rows -> {
                    Map<Integer, Long> byStatus = new LinkedHashMap<>();
                    long total = 0;
                    BigDecimal revenue = BigDecimal.ZERO;
                    BigDecimal gross = BigDecimal.ZERO;
                    for (Object[] r : rows) {
                        int status = (Integer) r[0];
                        long count = (Long) r[1];
                        BigDecimal amount = (BigDecimal) r[2];
                        byStatus.put(status, count);
                        total += count;
                        if (status == 6) {
                            revenue = revenue.add(amount);
                        }
                        if (status != 7 && status != 8) {
                            gross = gross.add(amount);
                        }
                    }
                    return ResponseData.success(new Overview(start, end, total, revenue, gross, byStatus));
                });
    }

    /** Sản phẩm bán chạy theo số lượng (không tính đơn CANCELLED/RETURNED). */
    @GetMapping("/top-products")
    public Mono<ResponseData<List<TopProduct>>> topProducts(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @RequestParam(defaultValue = "10") int limit) {
        LocalDate end = to == null ? LocalDate.now() : to;
        LocalDate start = from == null ? end.minusDays(29) : from;
        validateRange(start, end);
        LocalDateTime fromTime = start.atStartOfDay();
        LocalDateTime toTime = end.plusDays(1).atStartOfDay();
        return db.sql("""
                        SELECT i.sku, MAX(i.product_name) AS product_name,
                               SUM(i.quantity) AS qty, SUM(i.line_total) AS revenue
                        FROM order_items i
                        JOIN orders o ON o.id = i.order_id
                        WHERE o.created_at >= :from AND o.created_at < :to AND o.status NOT IN (7, 8)
                        GROUP BY i.sku
                        ORDER BY qty DESC, revenue DESC
                        LIMIT :limit
                        """)
                .bind("from", fromTime)
                .bind("to", toTime)
                .bind("limit", Math.min(Math.max(limit, 1), 100))
                .map((row, meta) -> new TopProduct(row.get("sku", String.class), row.get("product_name", String.class),
                        row.get("qty", Long.class), row.get("revenue", BigDecimal.class)))
                .all()
                .collectList()
                .map(ResponseData::success);
    }

    private static void validateRange(LocalDate from, LocalDate to) {
        if (from.isAfter(to)) {
            throw new BusinessException(ErrorCode.BAD_REQUEST, "from phải trước hoặc bằng to");
        }
        if (from.plusDays(366).isBefore(to)) {
            throw new BusinessException(ErrorCode.BAD_REQUEST, "Khoảng thời gian tối đa 1 năm");
        }
    }
}
