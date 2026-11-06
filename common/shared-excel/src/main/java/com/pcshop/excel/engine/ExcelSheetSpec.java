package com.pcshop.excel.engine;

import com.pcshop.excel.annotation.ImportExportMapping;

import java.math.BigDecimal;
import java.math.BigInteger;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.function.Function;

/**
 * Mô tả sheet dữ liệu: tên sheet, các cột theo thứ tự, số dòng tối đa khi import.
 * Dựng từ DTO bằng {@link #of(Class, Function)} rồi nối thêm cột động bằng {@link #withColumns(List)}.
 */
public record ExcelSheetSpec(String sheetName, List<ColumnDef> columns, int maxRows) {

    public static final int DEFAULT_MAX_ROWS = 2000;

    public ExcelSheetSpec {
        columns = List.copyOf(columns);
        Set<String> keys = new HashSet<>();
        for (ColumnDef column : columns) {
            if (!keys.add(column.key())) {
                throw new IllegalArgumentException("Trùng key cột: " + column.key());
            }
        }
        sheetName = sheetName == null || sheetName.isBlank() ? "Data" : sheetName;
        maxRows = maxRows <= 0 ? DEFAULT_MAX_ROWS : maxRows;
    }

    public static ExcelSheetSpec of(String sheetName, List<ColumnDef> columns) {
        return new ExcelSheetSpec(sheetName, columns, DEFAULT_MAX_ROWS);
    }

    /** Cột từ field của DTO ({@code @ImportExportMapping}), tên sheet là tên entity đã dịch. */
    public static ExcelSheetSpec of(Class<?> dtoClass, Function<String, String> translate) {
        String entity = ExcelColumn.entityName(dtoClass);
        List<ColumnDef> columns = new ArrayList<>();
        for (ExcelColumn column : ExcelColumn.of(dtoClass)) {
            columns.add(toColumnDef(column, entity, translate));
        }
        return new ExcelSheetSpec(ExcelWriter.translateOr(translate, entity, entity), columns, DEFAULT_MAX_ROWS);
    }

    /** Thêm cột vào cuối (cột động). */
    public ExcelSheetSpec withColumns(List<ColumnDef> more) {
        List<ColumnDef> all = new ArrayList<>(columns);
        all.addAll(more);
        return new ExcelSheetSpec(sheetName, all, maxRows);
    }

    public ExcelSheetSpec withMaxRows(int value) {
        return new ExcelSheetSpec(sheetName, columns, value);
    }

    public ExcelSheetSpec withSheetName(String value) {
        return new ExcelSheetSpec(value, columns, maxRows);
    }

    public ColumnDef column(String key) {
        return columns.stream().filter(c -> c.key().equals(key)).findFirst().orElse(null);
    }

    private static ColumnDef toColumnDef(ExcelColumn column, String entity, Function<String, String> translate) {
        ImportExportMapping mapping = column.mapping();
        ColumnDef def = ColumnDef.of(column.name(), column.header(entity, translate), typeOf(column.type()));
        if (mapping != null) {
            def = new ColumnDef(def.key(), def.header(), def.type(), mapping.required(), mapping.isTextColumn(),
                    mapping.isCurrency(), mapping.width(), mapping.comment(), column.referenceKey(),
                    mapping.multiple(), mapping.isCodeField(), null);
        }
        Class<? extends Enum<?>> enumClass = column.enumClass();
        return enumClass == null ? def : def.enumClass(enumClass);
    }

    private static ColumnType typeOf(Class<?> type) {
        if (type == Integer.class || type == int.class || type == Short.class || type == short.class
                || type == Byte.class || type == byte.class) {
            return ColumnType.INTEGER;
        }
        if (type == Long.class || type == long.class) {
            return ColumnType.LONG;
        }
        if (type == Double.class || type == double.class || type == Float.class || type == float.class
                || type == BigDecimal.class || type == BigInteger.class || Number.class.isAssignableFrom(type)) {
            return ColumnType.DECIMAL;
        }
        if (type == LocalDate.class) {
            return ColumnType.DATE;
        }
        if (type == LocalDateTime.class) {
            return ColumnType.DATE_TIME;
        }
        if (type == LocalTime.class) {
            return ColumnType.TIME;
        }
        if (type == Boolean.class || type == boolean.class) {
            return ColumnType.BOOLEAN;
        }
        return ColumnType.STRING;
    }
}
