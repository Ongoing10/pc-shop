package com.pcshop.inventory;

import com.pcshop.excel.annotation.ImportExportMapping;
import com.pcshop.excel.dto.BaseImportDTO;

/** Một dòng của file Excel phiếu nhập kho (IMP-2). */
public class StockImportRow extends BaseImportDTO {

    public static final String WAREHOUSE_REF = "Warehouse";

    @ImportExportMapping(header = "Mã kho", required = true, key = WAREHOUSE_REF, width = 256 * 28,
            comment = "Chọn trong danh sách kho đang hoạt động")
    private String warehouse;

    @ImportExportMapping(header = "SKU", required = true, isTextColumn = true, width = 256 * 24)
    private String sku;

    @ImportExportMapping(header = "Số lượng nhập", required = true, comment = "Số nguyên lớn hơn 0")
    private Integer quantity;

    @ImportExportMapping(header = "Ghi chú", width = 256 * 40)
    private String note;

    public StockImportRow() {
    }

    public String getWarehouse() {
        return warehouse;
    }

    public String getSku() {
        return sku;
    }

    public Integer getQuantity() {
        return quantity;
    }

    public String getNote() {
        return note;
    }
}
