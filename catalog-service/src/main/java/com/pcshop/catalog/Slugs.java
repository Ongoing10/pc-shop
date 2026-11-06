package com.pcshop.catalog;

import java.text.Normalizer;
import java.util.Locale;

/** Sinh slug từ tên tiếng Việt: "Card đồ họa RTX" → "card-do-hoa-rtx". */
public final class Slugs {

    private Slugs() {
    }

    public static String of(String text) {
        String noAccent = Normalizer.normalize(text.replace('đ', 'd').replace('Đ', 'D'), Normalizer.Form.NFD)
                .replaceAll("\\p{M}+", "");
        return noAccent.toLowerCase(Locale.ROOT)
                .replaceAll("[^a-z0-9]+", "-")
                .replaceAll("(^-|-$)", "");
    }

    /** Slug do người dùng nhập (chuẩn hóa lại), để trống thì sinh từ tên. */
    public static String orFrom(String slug, String name) {
        return slug == null || slug.isBlank() ? of(name) : of(slug);
    }
}
