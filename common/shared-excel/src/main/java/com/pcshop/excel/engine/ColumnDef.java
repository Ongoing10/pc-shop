package com.pcshop.excel.engine;

/**
 * Mô tả một cột Excel không phụ thuộc DTO: dùng cho cột động (vd thông số theo {@code spec_schema} của danh mục).
 * Cột của DTO cũng được đổi sang {@code ColumnDef} (xem {@link ExcelSheetSpec#of}) để đọc/ghi dùng chung một đường code.
 *
 * <pre>{@code
 * ColumnDef.text("sku", "SKU").asRequired().asText().asCode()
 * ColumnDef.of("compat.socket", "Socket", ColumnType.STRING).dropdown("compat.socket")
 * }</pre>
 *
 * @param key         khóa của giá trị trong {@code Map} (tên field với DTO)
 * @param header      tên cột hiển thị (chưa có dấu {@code (*)})
 * @param textFormat  định dạng ô là Text để Excel không đổi "001" thành 1
 * @param currency    số hiển thị dạng tiền {@code #,##0}
 * @param width       độ rộng, đơn vị 1/256 ký tự
 * @param comment     ghi chú trên ô tiêu đề (mã message hoặc chữ), rỗng thì không có
 * @param dropdownKey key trong {@code references}: export có dropdown, import kiểm tra giá trị nằm trong danh sách
 * @param multiple    ô chứa nhiều giá trị cách nhau dấu phẩy (dropdown không chặn nhập tự do)
 * @param code        cột mã: báo lỗi nếu trùng với một dòng phía trên trong file
 * @param enumClass   enum của cột (cột DTO kiểu enum): ghi chữ đã dịch, đọc chữ hoặc tên hằng về enum
 */
public record ColumnDef(String key,
                        String header,
                        ColumnType type,
                        boolean required,
                        boolean textFormat,
                        boolean currency,
                        int width,
                        String comment,
                        String dropdownKey,
                        boolean multiple,
                        boolean code,
                        Class<? extends Enum<?>> enumClass) {

    public static final int DEFAULT_WIDTH = 256 * 15;

    public ColumnDef {
        if (key == null || key.isBlank()) {
            throw new IllegalArgumentException("ColumnDef cần key");
        }
        if (type == null) {
            throw new IllegalArgumentException("ColumnDef " + key + " cần type");
        }
        header = header == null || header.isBlank() ? key : header;
        comment = comment == null ? "" : comment;
        dropdownKey = dropdownKey == null || dropdownKey.isBlank() ? null : dropdownKey;
        width = width <= 0 ? DEFAULT_WIDTH : width;
    }

    public static ColumnDef of(String key, String header, ColumnType type) {
        return new ColumnDef(key, header, type, false, false, false, DEFAULT_WIDTH, "", null, false, false, null);
    }

    public static ColumnDef text(String key, String header) {
        return of(key, header, ColumnType.STRING);
    }

    public static ColumnDef integer(String key, String header) {
        return of(key, header, ColumnType.INTEGER);
    }

    public static ColumnDef decimal(String key, String header) {
        return of(key, header, ColumnType.DECIMAL);
    }

    public ColumnDef asRequired() {
        return new ColumnDef(key, header, type, true, textFormat, currency, width, comment, dropdownKey, multiple, code, enumClass);
    }

    public ColumnDef required(boolean value) {
        return new ColumnDef(key, header, type, value, textFormat, currency, width, comment, dropdownKey, multiple, code, enumClass);
    }

    public ColumnDef asText() {
        return new ColumnDef(key, header, type, required, true, currency, width, comment, dropdownKey, multiple, code, enumClass);
    }

    public ColumnDef asCurrency() {
        return new ColumnDef(key, header, type, required, textFormat, true, width, comment, dropdownKey, multiple, code, enumClass);
    }

    public ColumnDef width(int chars) {
        return new ColumnDef(key, header, type, required, textFormat, currency, chars * 256, comment, dropdownKey, multiple, code, enumClass);
    }

    public ColumnDef comment(String value) {
        return new ColumnDef(key, header, type, required, textFormat, currency, width, value, dropdownKey, multiple, code, enumClass);
    }

    public ColumnDef dropdown(String referenceKey) {
        return new ColumnDef(key, header, type, required, textFormat, currency, width, comment, referenceKey, multiple, code, enumClass);
    }

    public ColumnDef asMultiple() {
        return new ColumnDef(key, header, type, required, textFormat, currency, width, comment, dropdownKey, true, code, enumClass);
    }

    public ColumnDef asCode() {
        return new ColumnDef(key, header, type, required, textFormat, currency, width, comment, dropdownKey, multiple, true, enumClass);
    }

    public ColumnDef enumClass(Class<? extends Enum<?>> value) {
        return new ColumnDef(key, header, type, required, textFormat, currency, width, comment, dropdownKey, multiple, code, value);
    }

    /** Ô chứa nhiều giá trị: kiểu {@link ColumnType#STRING_LIST} hoặc khai {@link #asMultiple()}. */
    public boolean isMultiValue() {
        return multiple || type == ColumnType.STRING_LIST;
    }

    /** Tên cột trên dòng tiêu đề: thêm {@code (*)} nếu bắt buộc. */
    public String title() {
        return required ? header + " (*)" : header;
    }
}
