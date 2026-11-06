package com.pcshop.excel.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;
import java.util.UUID;

/** Response của bước validate / import (bọc trong ResponseData), giống nhau ở mọi service (guide mục 4). */
public final class ImportResults {

    /** Số dòng hợp lệ tối đa trả về để admin xem trước. */
    public static final int PREVIEW_ROWS = 20;

    private ImportResults() {
    }

    /** Lỗi của một dòng; {@code row} là số dòng như Excel hiển thị (dòng tiêu đề là 1). */
    public record RowError(@JsonProperty("row") int row,
                           @JsonProperty("messages") List<String> messages) {
    }

    public record ValidateResult(@JsonProperty("import_id") UUID importId,
                                 @JsonProperty("mode") String mode,
                                 @JsonProperty("total_rows") int totalRows,
                                 @JsonProperty("valid_rows") int validRows,
                                 @JsonProperty("invalid_rows") int invalidRows,
                                 @JsonProperty("errors") List<RowError> errors,
                                 @JsonProperty("preview") List<?> preview) {
    }

    public record ImportResult(@JsonProperty("total_rows") int totalRows,
                               @JsonProperty("created") int created,
                               @JsonProperty("updated") int updated,
                               @JsonProperty("failed") int failed,
                               @JsonProperty("errors") List<RowError> errors) {
    }

    /** Lỗi các dòng không hợp lệ, theo thứ tự dòng. */
    public static List<RowError> errors(List<? extends BaseImportDTO> rows) {
        List<RowError> result = new ArrayList<>();
        for (BaseImportDTO row : rows) {
            if (!row.getIsValid()) {
                result.add(new RowError(row.getRow() + 1, row.getErrors()));
            }
        }
        return result;
    }

    /** Chỉ số dòng trong sheet -> lỗi, dùng cho {@code ExcelResultWriter.withErrors}. */
    public static Map<Integer, List<String>> errorsByRow(List<? extends BaseImportDTO> rows) {
        Map<Integer, List<String>> result = new TreeMap<>();
        for (BaseImportDTO row : rows) {
            if (!row.getIsValid()) {
                result.put(row.getRow(), row.getErrors());
            }
        }
        return result;
    }

    public static long invalidCount(List<? extends BaseImportDTO> rows) {
        return rows.stream().filter(r -> !r.getIsValid()).count();
    }
}
