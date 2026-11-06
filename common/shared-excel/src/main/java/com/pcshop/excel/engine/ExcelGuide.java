package com.pcshop.excel.engine;

import java.util.List;
import java.util.Map;

/**
 * Nội dung sheet "Hướng dẫn" của file mẫu: tiêu đề, các ghi chú và một dòng ví dụ theo key cột.
 * Dòng ví dụ nằm ở sheet Hướng dẫn (không ở sheet dữ liệu) để admin không lỡ import nó thành dữ liệu thật.
 */
public record ExcelGuide(String title, List<String> notes, Map<String, Object> example) {

    public static final String SHEET_NAME = "Hướng dẫn";

    public ExcelGuide {
        notes = notes == null ? List.of() : List.copyOf(notes);
        example = example == null ? Map.of() : example;
    }
}
