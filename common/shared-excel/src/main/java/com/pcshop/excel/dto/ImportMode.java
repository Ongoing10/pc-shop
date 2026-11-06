package com.pcshop.excel.dto;

public enum ImportMode {

    INSERT(1, "Thêm mới"),
    UPDATE(2, "Cập nhật");

    public final int value;
    public final String text;

    ImportMode(int value, String text) {
        this.value = value;
        this.text = text;
    }

    public static ImportMode of(int value) {
        return value == UPDATE.value ? UPDATE : INSERT;
    }
}
