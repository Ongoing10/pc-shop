package com.pcshop.excel.engine;

import com.pcshop.excel.annotation.ExcelEnum;
import com.pcshop.excel.annotation.ImportExportMapping;
import com.pcshop.excel.dto.BaseImportDTO;
import com.pcshop.excel.util.Reflections;

import java.lang.reflect.Field;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/** Mô tả một cột Excel, dựng từ field của DTO. */
public record ExcelColumn(int index, Field field, ImportExportMapping mapping) {

    private static final Map<Class<?>, List<ExcelColumn>> CACHE = new ConcurrentHashMap<>();

    public String name() {
        return field.getName();
    }

    public Class<?> type() {
        return field.getType();
    }

    public boolean isCode() {
        return mapping != null && mapping.isCodeField();
    }

    public boolean isRequired() {
        return mapping != null && mapping.required();
    }

    public String referenceKey() {
        return mapping == null || mapping.key().isBlank() ? null : mapping.key();
    }

    public boolean isMultiple() {
        return mapping != null && mapping.multiple();
    }

    /** Enum của cột: khai ở {@code enumClass}, hoặc chính kiểu field nếu field là enum. */
    @SuppressWarnings("unchecked")
    public Class<? extends Enum<?>> enumClass() {
        if (mapping != null && mapping.enumClass() != ImportExportMapping.NoEnum.class) {
            return mapping.enumClass();
        }
        if (field.getType().isEnum()) {
            return (Class<? extends Enum<?>>) field.getType();
        }
        return null;
    }

    /** Tên cột: {@code header()} nếu khai, không thì dịch mã {@code <entity>.<field>}, không có thì tên field. */
    public String header(String entity, java.util.function.Function<String, String> translate) {
        if (mapping != null && !mapping.header().isBlank()) {
            return ExcelWriter.translateOr(translate, mapping.header(), mapping.header());
        }
        return ExcelWriter.translateOr(translate, entity + "." + name(), name());
    }

    public int width() {
        return mapping != null ? mapping.width() : 256 * 15;
    }

    /** Các cột của DTO theo thứ tự khai báo (field lớp cha trước), bỏ field của BaseImportDTO và field ignore. */
    public static List<ExcelColumn> of(Class<?> dtoClass) {
        return CACHE.computeIfAbsent(dtoClass, c -> {
            List<ExcelColumn> columns = new ArrayList<>();
            for (Field field : Reflections.allFields(c)) {
                if (field.getDeclaringClass() == BaseImportDTO.class) {
                    continue;
                }
                ImportExportMapping mapping = field.getAnnotation(ImportExportMapping.class);
                if (mapping != null && mapping.ignore()) {
                    continue;
                }
                columns.add(new ExcelColumn(columns.size(), field, mapping));
            }
            return List.copyOf(columns);
        });
    }

    /**
     * Tên entity dùng làm tiền tố message: {@code UserImportDTO -> user}, {@code UserExportDto -> user}.
     * Giữ cách đặt tên của bản MVC.
     */
    public static String entityName(Class<?> dtoClass) {
        return dtoClass.getSimpleName().toLowerCase(Locale.ROOT)
                .replaceFirst("dto", "")
                .replaceFirst("export", "")
                .replaceFirst("import", "");
    }

    /** Chữ hiển thị của một hằng enum (đã dịch nếu là mã message). */
    public static String enumText(Enum<?> value, java.util.function.Function<String, String> translate) {
        if (value instanceof ExcelEnum excelEnum) {
            return translate.apply(excelEnum.getText());
        }
        return translate.apply(value.name());
    }
}
