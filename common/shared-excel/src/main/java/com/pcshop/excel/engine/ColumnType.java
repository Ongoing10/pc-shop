package com.pcshop.excel.engine;

/** Kiểu dữ liệu của một cột: quyết định cách đọc ô và định dạng khi ghi. */
public enum ColumnType {

    STRING("Chữ"),
    INTEGER("Số nguyên"),
    LONG("Số nguyên"),
    DECIMAL("Số"),
    DATE("Ngày (dd/MM/yyyy)"),
    DATE_TIME("Ngày giờ (dd/MM/yyyy HH:mm)"),
    TIME("Giờ (HH:mm)"),
    BOOLEAN("Có/Không"),
    /** Nhiều giá trị trong một ô, cách nhau dấu phẩy (vd "DDR4, DDR5"). Đọc ra {@code List<String>}. */
    STRING_LIST("Danh sách, cách nhau dấu phẩy");

    /** Mô tả kiểu cho sheet Hướng dẫn. */
    public final String text;

    ColumnType(String text) {
        this.text = text;
    }
}
