package com.pcshop.ordering.order;

import com.pcshop.contracts.BusinessException;
import com.pcshop.contracts.ErrorCode;
import com.pcshop.excel.ExcelMessages;
import com.pcshop.excel.engine.ColumnDef;
import com.pcshop.excel.engine.ColumnType;
import com.pcshop.excel.engine.ExcelFileException;
import com.pcshop.excel.engine.ExcelSheetSpec;
import com.pcshop.excel.engine.ExcelStreamWriter;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;
import reactor.core.scheduler.Schedulers;

import java.io.IOException;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * EXP-1: export đơn hàng ra Excel 2 sheet (Đơn hàng, Chi tiết), cùng bộ lọc với GET /admin/orders.
 * Gom dữ liệu bằng R2DBC; ghi file (POI là thư viện chặn) bằng SXSSF trên boundedElastic.
 */
@Service
public class OrderExportService {

    /** Số đơn hỏi DB mỗi lần khi lấy dòng chi tiết (giới hạn số tham số của câu IN). */
    private static final int ITEM_QUERY_CHUNK = 1000;
    /** Giới hạn số dòng của sheet Chi tiết (sheet Excel tối đa ~1 triệu dòng). */
    private static final int MAX_ITEM_ROWS = 1_000_000;

    private static final Map<Integer, String> STATUS_TEXT = Map.of(
            Order.PENDING, "Chờ xác nhận",
            Order.AWAITING_PAYMENT, "Chờ thanh toán",
            Order.PAID, "Đã thanh toán",
            Order.CONFIRMED, "Đã xác nhận",
            Order.SHIPPING, "Đang giao",
            Order.COMPLETED, "Hoàn thành",
            Order.CANCELLED, "Đã hủy",
            Order.RETURNED, "Trả hàng");
    private static final Map<Integer, String> PAYMENT_METHOD_TEXT = Map.of(1, "COD", 2, "VNPay", 3, "MoMo");
    private static final Map<Integer, String> PAYMENT_STATUS_TEXT = Map.of(
            1, "Chưa thanh toán", 2, "Đã thanh toán", 3, "Đã hoàn tiền");

    private static final List<ColumnDef> ORDER_COLUMNS = List.of(
            ColumnDef.text("code", "Mã đơn").asText().width(20),
            ColumnDef.of("placedAt", "Ngày đặt", ColumnType.DATE_TIME).width(18),
            ColumnDef.text("userId", "Mã khách").width(38),
            ColumnDef.text("receiverName", "Người nhận").width(24),
            ColumnDef.text("receiverPhone", "SĐT").asText().width(14),
            ColumnDef.text("shippingAddress", "Địa chỉ").width(50),
            ColumnDef.text("status", "Trạng thái").width(16),
            ColumnDef.text("payment", "Thanh toán").width(24),
            ColumnDef.text("voucherCode", "Voucher").width(14),
            ColumnDef.decimal("subtotal", "Tạm tính").asCurrency(),
            ColumnDef.decimal("discount", "Giảm giá").asCurrency(),
            ColumnDef.decimal("shippingFee", "Phí ship").asCurrency(),
            ColumnDef.decimal("total", "Tổng").asCurrency());

    private static final ExcelSheetSpec ITEM_SPEC = ExcelSheetSpec.of("Chi tiết", List.of(
            ColumnDef.text("code", "Mã đơn").asText().width(20),
            ColumnDef.text("sku", "SKU").asText().width(24),
            ColumnDef.text("productName", "Tên sản phẩm").width(50),
            ColumnDef.decimal("unitPrice", "Đơn giá").asCurrency(),
            ColumnDef.integer("quantity", "Số lượng"),
            ColumnDef.decimal("discount", "Giảm giá").asCurrency(),
            ColumnDef.decimal("lineTotal", "Thành tiền").asCurrency())).withMaxRows(MAX_ITEM_ROWS);

    public record ExcelFile(String filename, byte[] content) {
    }

    private final OrderService orders;
    private final OrderItemRepository items;
    private final int maxExportRows;

    public OrderExportService(OrderService orders, OrderItemRepository items,
                              @Value("${pcshop.excel.max-export-rows:10000}") int maxExportRows) {
        this.orders = orders;
        this.items = items;
        this.maxExportRows = maxExportRows;
    }

    public Mono<ExcelFile> export(Integer status, LocalDate from, LocalDate to, String q) {
        return orders.countForAdmin(status, from, to, q)
                .flatMap(count -> count > maxExportRows
                        ? Mono.error(new BusinessException(ErrorCode.BAD_REQUEST, "Có " + count + " đơn, vượt giới hạn "
                                + maxExportRows + " đơn mỗi lần export: hãy thu hẹp bộ lọc (trạng thái, khoảng ngày)"))
                        : orders.findForAdmin(status, from, to, q, maxExportRows).collectList())
                .flatMap(found -> loadItems(found).flatMap(lines ->
                        Mono.fromCallable(() -> write(found, lines)).subscribeOn(Schedulers.boundedElastic())));
    }

    private Mono<List<OrderItem>> loadItems(List<Order> found) {
        List<Long> ids = found.stream().map(Order::getId).toList();
        return Flux.fromIterable(ids)
                .buffer(ITEM_QUERY_CHUNK)
                .concatMap(items::findAllByOrderIdInOrderByOrderIdAscIdAsc)
                .collectList();
    }

    /** Ghi file (chặn, gọi trên boundedElastic): đơn theo thứ tự danh sách, chi tiết theo thứ tự đơn. */
    private ExcelFile write(List<Order> found, List<OrderItem> lines) throws IOException {
        Map<Long, List<OrderItem>> byOrder = new HashMap<>();
        lines.forEach(i -> byOrder.computeIfAbsent(i.getOrderId(), k -> new ArrayList<>()).add(i));

        List<Map<String, Object>> orderRows = new ArrayList<>(found.size());
        List<Map<String, Object>> itemRows = new ArrayList<>(lines.size());
        for (Order o : found) {
            orderRows.add(orderRow(o));
            for (OrderItem i : byOrder.getOrDefault(o.getId(), List.of())) {
                itemRows.add(itemRow(o, i));
            }
        }
        ExcelSheetSpec orderSpec = ExcelSheetSpec.of("Đơn hàng", ORDER_COLUMNS).withMaxRows(maxExportRows);
        try (ExcelStreamWriter writer = new ExcelStreamWriter(ExcelMessages.VI)) {
            byte[] content = writer.sheet(orderSpec, orderRows).sheet(ITEM_SPEC, itemRows).toBytes();
            return new ExcelFile("Đơn hàng " + LocalDate.now() + ".xlsx", content);
        } catch (ExcelFileException e) {
            throw new BusinessException(ErrorCode.BAD_REQUEST, e.getMessage());
        }
    }

    private static Map<String, Object> orderRow(Order o) {
        Map<String, Object> row = new HashMap<>();
        row.put("code", o.getCode());
        row.put("placedAt", o.getPlacedAt() != null ? o.getPlacedAt() : o.getCreatedAt());
        row.put("userId", o.getUserId() == null ? null : o.getUserId().toString());
        row.put("receiverName", o.getReceiverName());
        row.put("receiverPhone", o.getReceiverPhone());
        row.put("shippingAddress", o.getShippingAddress());
        row.put("status", STATUS_TEXT.getOrDefault(o.getStatus(), String.valueOf(o.getStatus())));
        row.put("payment", paymentText(o));
        row.put("voucherCode", o.getVoucherCode());
        row.put("subtotal", o.getSubtotalAmount());
        row.put("discount", o.getDiscountAmount());
        row.put("shippingFee", o.getShippingFee());
        row.put("total", o.getTotalAmount());
        return row;
    }

    private static Map<String, Object> itemRow(Order o, OrderItem i) {
        Map<String, Object> row = new HashMap<>();
        row.put("code", o.getCode());
        row.put("sku", i.getSku());
        row.put("productName", i.getProductName());
        row.put("unitPrice", i.getUnitPrice());
        row.put("quantity", i.getQuantity());
        row.put("discount", i.getDiscountAmount());
        row.put("lineTotal", i.getLineTotal());
        return row;
    }

    private static String paymentText(Order o) {
        String method = o.getPaymentMethod() == null ? null : PAYMENT_METHOD_TEXT.getOrDefault(o.getPaymentMethod(),
                String.valueOf(o.getPaymentMethod()));
        String status = o.getPaymentStatus() == null ? null : PAYMENT_STATUS_TEXT.getOrDefault(o.getPaymentStatus(),
                String.valueOf(o.getPaymentStatus()));
        if (method == null) {
            return status;
        }
        return status == null ? method : method + " - " + status;
    }
}
