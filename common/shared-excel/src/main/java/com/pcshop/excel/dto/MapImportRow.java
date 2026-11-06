package com.pcshop.excel.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

import java.math.BigDecimal;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Một dòng đọc theo {@code ExcelSheetSpec} (cột động): giá trị theo key cột, đã đổi kiểu theo {@code ColumnType}.
 * Ô trống thì không có key. Cột dropdown chứa mã (phần trước dấu {@code |}), cột nhiều giá trị là {@code List<String>}.
 */
public class MapImportRow extends BaseImportDTO {

    @JsonProperty("values")
    private final Map<String, Object> values = new LinkedHashMap<>();

    public Map<String, Object> getValues() {
        return values;
    }

    public Object get(String key) {
        return values.get(key);
    }

    public void put(String key, Object value) {
        if (value == null) {
            values.remove(key);
        } else {
            values.put(key, value);
        }
    }

    public boolean has(String key) {
        return values.containsKey(key);
    }

    public String getString(String key) {
        Object value = values.get(key);
        return value == null ? null : value.toString();
    }

    public Integer getInteger(String key) {
        Object value = values.get(key);
        return value instanceof Number n ? Integer.valueOf(n.intValue()) : null;
    }

    public Long getLong(String key) {
        Object value = values.get(key);
        return value instanceof Number n ? Long.valueOf(n.longValue()) : null;
    }

    public BigDecimal getDecimal(String key) {
        Object value = values.get(key);
        if (value instanceof BigDecimal bd) {
            return bd;
        }
        return value instanceof Number n ? new BigDecimal(n.toString()) : null;
    }

    public Boolean getBoolean(String key) {
        return values.get(key) instanceof Boolean b ? b : null;
    }

    @SuppressWarnings("unchecked")
    public List<String> getList(String key) {
        Object value = values.get(key);
        if (value instanceof List<?> list) {
            return (List<String>) list;
        }
        return value == null ? null : List.of(value.toString());
    }
}
