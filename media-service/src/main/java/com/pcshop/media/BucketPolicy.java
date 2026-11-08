package com.pcshop.media;

import com.pcshop.contracts.AuthUser;

import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.function.Predicate;

/**
 * Luật của từng bucket: ai được upload, nhận đuôi file nào, tối đa bao nhiêu byte, ai được xem.
 * MIME type do server quyết định theo đuôi file (không tin Content-Type client gửi), nên không upload được
 * file HTML/SVG/JS để trình duyệt chạy trên origin của API.
 */
public record BucketPolicy(Map<String, String> mimeByExtension, long maxBytes,
                           Predicate<AuthUser> canUpload, boolean internal) {

    private static final Map<String, String> IMAGES = Map.of(
            ".jpg", "image/jpeg", ".jpeg", "image/jpeg", ".png", "image/png", ".webp", "image/webp",
            ".gif", "image/gif");

    private static final Map<String, String> DOCUMENTS = Map.of(
            ".pdf", "application/pdf",
            ".docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            ".txt", "text/plain; charset=UTF-8",
            ".md", "text/markdown; charset=UTF-8");

    private static final long MB = 1024 * 1024;

    /** Ai cũng xem được trừ bucket internal (chỉ ADMIN hoặc knowledge:write). */
    public static final Map<String, BucketPolicy> ALL = Map.of(
            "products", new BucketPolicy(IMAGES, 5 * MB, u -> u.hasPermission("product:write"), false),
            "avatars", new BucketPolicy(IMAGES, 2 * MB, u -> true, false),
            "reviews", new BucketPolicy(IMAGES, 5 * MB, u -> true, false),
            "knowledge-docs", new BucketPolicy(DOCUMENTS, 20 * MB, BucketPolicy::canManageKnowledge, true));

    public static boolean canManageKnowledge(AuthUser user) {
        return user.hasRole("ADMIN") || user.hasPermission("knowledge:write");
    }

    /** MIME theo đuôi file; rỗng nếu bucket không nhận đuôi này. */
    public Optional<String> mimeOf(String extension) {
        return Optional.ofNullable(mimeByExtension.get(extension.toLowerCase(Locale.ROOT)));
    }
}
