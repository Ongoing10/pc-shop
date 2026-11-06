package com.pcshop.excel;

import java.util.Map;
import java.util.function.Function;

/**
 * Hàm "translate" mặc định cho engine: đổi mã message của engine sang tiếng Việt.
 * Dự án không dùng i18n nên truyền {@link #VI} vào ExcelReader/ExcelWriter là đủ.
 * Mã không có trong bảng thì trả lại chính mã (engine sẽ dùng giá trị fallback).
 */
public final class ExcelMessages {

    private ExcelMessages() {
    }

    private static final Map<String, String> VI_TEXTS = Map.of(
            "import.code_is_not_existed", "giá trị không có trong danh sách",
            "import.not_in_list", "không có trong danh sách",
            "import.date_time_is_not_valid", "ngày giờ không hợp lệ (dùng dd/MM/yyyy)",
            "import.number_is_not_valid", "số không hợp lệ",
            "import.integer_is_not_valid", "phải là số nguyên",
            "import.boolean_is_not_valid", "chỉ nhận có/không",
            "import.required", "bắt buộc",
            "import.row_is_duplicated", "trùng mã với một dòng phía trên trong file");

    public static final Function<String, String> VI = code -> VI_TEXTS.getOrDefault(code, code);
}
