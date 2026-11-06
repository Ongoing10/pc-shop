package com.pcshop.excel.reference;

/** Một dòng dữ liệu tham chiếu cho dropdown và kiểm tra import. */
public record ReferenceItem(Long id, String code, String name) {

    public static final String SEPARATOR = "|";

    /** Chữ hiện trong dropdown: {@code Mã|Tên}, hoặc chỉ mã nếu không có tên. */
    public String display() {
        return name == null || name.isBlank() ? code : code + SEPARATOR + name;
    }

    /** Lấy mã từ chữ trong ô: {@code "NV01|Nguyễn Văn A" -> "NV01"}. */
    public static String extractCode(String cellValue) {
        if (cellValue == null) {
            return null;
        }
        String trimmed = cellValue.trim();
        int index = trimmed.lastIndexOf(SEPARATOR);
        return index > 0 ? trimmed.substring(0, index).trim() : trimmed;
    }
}
