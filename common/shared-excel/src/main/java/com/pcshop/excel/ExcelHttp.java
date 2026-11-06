package com.pcshop.excel;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.text.Normalizer;

/** Header HTTP khi trả file Excel (dùng cho cả Quarkus và Spring). */
public final class ExcelHttp {

    public static final String XLSX = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

    private ExcelHttp() {
    }

    /**
     * {@code attachment; filename="<tên không dấu>"; filename*=UTF-8''<tên đã encode>}: trình duyệt mới dùng
     * {@code filename*} (giữ tiếng Việt), trình duyệt cũ dùng {@code filename}.
     */
    public static String contentDisposition(String filename) {
        String ascii = Normalizer.normalize(filename.replace('đ', 'd').replace('Đ', 'D'), Normalizer.Form.NFD)
                .replaceAll("\\p{M}+", "")
                .replaceAll("[^A-Za-z0-9._-]+", "_");
        String encoded = URLEncoder.encode(filename, StandardCharsets.UTF_8).replace("+", "%20");
        return "attachment; filename=\"" + ascii + "\"; filename*=UTF-8''" + encoded;
    }
}
