package com.pcshop.excel.engine;

import org.apache.poi.ss.usermodel.BorderStyle;
import org.apache.poi.ss.usermodel.CellStyle;
import org.apache.poi.ss.usermodel.FillPatternType;
import org.apache.poi.ss.usermodel.Font;
import org.apache.poi.ss.usermodel.HorizontalAlignment;
import org.apache.poi.ss.usermodel.IndexedColors;
import org.apache.poi.ss.usermodel.Workbook;

/** Style dùng trong một workbook. Tạo một lần cho mỗi workbook (POI giới hạn số style). */
public final class ExcelStyles {

    public final CellStyle header;
    public final CellStyle number;
    public final CellStyle decimal;
    public final CellStyle currency;
    public final CellStyle date;
    public final CellStyle dateTime;
    public final CellStyle time;
    public final CellStyle text;
    /** Chữ có dấu {@code '} ẩn phía trước: Excel không coi là công thức (chống formula injection). */
    public final CellStyle quoted;
    /** Tiêu đề in đậm, không viền (sheet Hướng dẫn). */
    public final CellStyle title;
    /** Chữ xuống dòng trong ô. */
    public final CellStyle wrap;

    public ExcelStyles(Workbook wb) {
        var dataFormat = wb.createDataFormat();

        Font bold = wb.createFont();
        bold.setFontName("Arial");
        bold.setBold(true);

        header = wb.createCellStyle();
        header.setBorderTop(BorderStyle.THIN);
        header.setBorderBottom(BorderStyle.THIN);
        header.setBorderLeft(BorderStyle.THIN);
        header.setBorderRight(BorderStyle.THIN);
        header.setAlignment(HorizontalAlignment.CENTER);
        header.setFont(bold);
        header.setFillForegroundColor(IndexedColors.GREY_25_PERCENT.getIndex());
        header.setFillPattern(FillPatternType.SOLID_FOREGROUND);
        header.setWrapText(true);

        number = wb.createCellStyle();
        number.setAlignment(HorizontalAlignment.RIGHT);
        number.setDataFormat(dataFormat.getFormat("0"));

        decimal = wb.createCellStyle();
        decimal.setAlignment(HorizontalAlignment.RIGHT);
        decimal.setDataFormat(dataFormat.getFormat("0.00"));

        currency = wb.createCellStyle();
        currency.setAlignment(HorizontalAlignment.RIGHT);
        currency.setDataFormat(dataFormat.getFormat("#,##0"));

        date = wb.createCellStyle();
        date.setAlignment(HorizontalAlignment.CENTER);
        date.setDataFormat(dataFormat.getFormat("dd/mm/yyyy"));

        dateTime = wb.createCellStyle();
        dateTime.setAlignment(HorizontalAlignment.CENTER);
        dateTime.setDataFormat(dataFormat.getFormat("dd/mm/yyyy hh:mm"));

        time = wb.createCellStyle();
        time.setAlignment(HorizontalAlignment.CENTER);
        time.setDataFormat(dataFormat.getFormat("hh:mm:ss"));

        text = wb.createCellStyle();
        text.setDataFormat(dataFormat.getFormat("@"));

        quoted = wb.createCellStyle();
        quoted.setDataFormat(dataFormat.getFormat("@"));
        quoted.setQuotePrefixed(true);

        title = wb.createCellStyle();
        title.setFont(bold);

        wrap = wb.createCellStyle();
        wrap.setWrapText(true);
    }
}
