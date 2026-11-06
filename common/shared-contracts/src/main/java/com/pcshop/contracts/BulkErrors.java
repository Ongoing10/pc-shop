package com.pcshop.contracts;

import java.util.ArrayList;
import java.util.Collection;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

/**
 * Gom lỗi của API hàng loạt (quy ước "tất cả hoặc không"): kiểm tra hết các dòng, có dòng lỗi thì
 * {@link #throwIfAny()} ném 400 kèm danh sách {@code [{id, reason}]} ở trường {@code data}, không ghi gì.
 */
public final class BulkErrors {

    public static final int MAX_ITEMS = 100;

    public record Item(String id, String reason) {
    }

    private final List<Item> items = new ArrayList<>();

    /** Kiểm tra số lượng và id trùng ngay từ đầu. */
    public static BulkErrors check(Collection<?> ids) {
        if (ids == null || ids.isEmpty()) {
            throw new BusinessException(ErrorCode.BAD_REQUEST, "Danh sách rỗng");
        }
        if (ids.size() > MAX_ITEMS) {
            throw new BusinessException(ErrorCode.BAD_REQUEST, "Tối đa " + MAX_ITEMS + " phần tử mỗi lần");
        }
        BulkErrors errors = new BulkErrors();
        Set<Object> seen = new HashSet<>();
        for (Object id : ids) {
            if (id == null) {
                errors.add("null", "Thiếu id");
            } else if (!seen.add(id)) {
                errors.add(id, "Bị lặp trong danh sách");
            }
        }
        errors.throwIfAny();
        return errors;
    }

    public BulkErrors add(Object id, String reason) {
        items.add(new Item(String.valueOf(id), reason));
        return this;
    }

    /** Chạy kiểm tra cho một dòng; BusinessException ném ra được ghi thành lỗi của dòng đó. */
    public void tryRun(Object id, Runnable check) {
        try {
            check.run();
        } catch (BusinessException e) {
            add(id, e.getMessage());
        }
    }

    public boolean isEmpty() {
        return items.isEmpty();
    }

    public void throwIfAny() {
        if (!items.isEmpty()) {
            throw new BusinessException(ErrorCode.BAD_REQUEST,
                    items.size() + " dòng không hợp lệ, chưa lưu gì", List.copyOf(items));
        }
    }
}
