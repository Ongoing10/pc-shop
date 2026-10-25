package com.pcshop.contracts;

import java.util.List;

/**
 * Định dạng phân trang chung:
 * <pre>{"content": [...], "page": {"size": 20, "number": 0, "totalElements": 95, "totalPages": 5}}</pre>
 */
public record PageResponse<T>(List<T> content, PageInfo page) {

    public record PageInfo(int size, int number, long totalElements, int totalPages) {
    }

    public static <T> PageResponse<T> of(List<T> content, int page, int size, long totalElements) {
        int totalPages = size <= 0 ? 0 : (int) Math.ceil((double) totalElements / size);
        return new PageResponse<>(content, new PageInfo(size, page, totalElements, totalPages));
    }
}
