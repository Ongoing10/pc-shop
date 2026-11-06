package com.pcshop.excel.annotation;

/**
 * Enum dùng trong Excel. {@link #getText()} là mã message i18n (hoặc chữ hiển thị).
 *
 * <pre>{@code
 * public enum Gender implements ExcelEnum {
 *     MALE("gender.male"), FEMALE("gender.female");
 *     private final String text;
 *     Gender(String text) { this.text = text; }
 *     public String getText() { return text; }
 * }
 * }</pre>
 */
public interface ExcelEnum {

    String getText();
}
