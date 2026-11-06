package com.pcshop.ordering.order;

import com.pcshop.common.webflux.security.CurrentUser;
import com.pcshop.contracts.PageResponse;
import com.pcshop.contracts.ResponseData;
import com.pcshop.excel.ExcelHttp;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import reactor.core.publisher.Mono;

import java.time.LocalDate;
import java.util.List;

/** Quản lý đơn hàng của nhân viên. Xem: STAFF/ADMIN. Đổi trạng thái: permission order:update-status. */
@RestController
@RequestMapping("/api/v1/admin/orders")
public class AdminOrderController {

    public record StatusRequest(@NotNull @Min(1) @Max(8) Integer status, @Size(max = 255) String reason) {
    }

    public record BulkStatusRequest(@NotEmpty @Size(max = 100) List<String> codes,
                                    @NotNull @Min(1) @Max(8) Integer status, @Size(max = 255) String reason) {
    }

    private final OrderService service;
    private final OrderExportService exportService;

    public AdminOrderController(OrderService service, OrderExportService exportService) {
        this.service = service;
        this.exportService = exportService;
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('STAFF', 'ADMIN')")
    public Mono<ResponseData<PageResponse<Order>>> list(
            @RequestParam(required = false) Integer status,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @RequestParam(required = false) String q,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return service.search(status, from, to, q, page, size).map(ResponseData::success);
    }

    /** EXP-1: Excel 2 sheet (Đơn hàng, Chi tiết), cùng bộ lọc với danh sách. */
    @GetMapping("/export")
    @PreAuthorize("hasAnyRole('STAFF', 'ADMIN')")
    public Mono<ResponseEntity<byte[]>> export(
            @RequestParam(required = false) Integer status,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @RequestParam(required = false) String q) {
        return exportService.export(status, from, to, q)
                .map(file -> ResponseEntity.ok()
                        .contentType(MediaType.parseMediaType(ExcelHttp.XLSX))
                        .header(HttpHeaders.CONTENT_DISPOSITION, ExcelHttp.contentDisposition(file.filename()))
                        .body(file.content()));
    }

    /** Chi tiết đơn kèm các dòng sản phẩm (snapshot lúc đặt). */
    @GetMapping("/{code}")
    @PreAuthorize("hasAnyRole('STAFF', 'ADMIN')")
    public Mono<ResponseData<OrderService.OrderDetail>> detail(@PathVariable String code) {
        return CurrentUser.require()
                .flatMap(user -> service.detail(code, user))
                .map(ResponseData::success);
    }

    /** Đổi trạng thái theo luồng hợp lệ (OrderService.TRANSITIONS), ghi lịch sử cùng transaction. */
    @PatchMapping("/{code}/status")
    @PreAuthorize("hasAuthority('order:update-status')")
    public Mono<ResponseData<Order>> changeStatus(@PathVariable String code, @Valid @RequestBody StatusRequest request) {
        return CurrentUser.require()
                .flatMap(user -> service.changeStatus(code, request.status(), request.reason(), user))
                .map(ResponseData::success);
    }

    /** Đổi trạng thái nhiều đơn; một đơn không hợp lệ thì không đổi đơn nào (trả danh sách lỗi). */
    @PatchMapping("/bulk/status")
    @PreAuthorize("hasAuthority('order:update-status')")
    public Mono<ResponseData<List<Order>>> changeStatusAll(@Valid @RequestBody BulkStatusRequest request) {
        return CurrentUser.require()
                .flatMap(user -> service.changeStatusAll(request.codes(), request.status(), request.reason(), user))
                .map(ResponseData::success);
    }
}
