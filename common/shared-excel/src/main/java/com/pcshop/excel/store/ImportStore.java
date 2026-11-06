package com.pcshop.excel.store;

import java.util.Map;
import java.util.Optional;
import java.util.UUID;

/**
 * Nơi giữ file import giữa bước validate và bước import (bản đồng bộ, không phụ thuộc framework).
 * Bản {@link TempDirImportStore} lưu ở thư mục trên máy: chỉ đúng khi service chạy 1 instance.
 * Phía WebFlux gọi trong {@code Mono.fromCallable(...).subscribeOn(Schedulers.boundedElastic())}.
 */
public interface ImportStore {

    /** Key metadata dùng chung. */
    String META_USER_ID = "userId";
    String META_KIND = "kind";
    String META_MODE = "mode";

    UUID save(byte[] content);

    /** Lưu file kèm metadata (người upload, loại import, mode, ...) để bước import kiểm tra lại. */
    default UUID save(byte[] content, Map<String, String> meta) {
        throw new UnsupportedOperationException(getClass().getSimpleName() + " không hỗ trợ metadata");
    }

    /** Rỗng nếu không có hoặc đã hết hạn. */
    Optional<byte[]> load(UUID id);

    /** Metadata đã lưu cùng file; rỗng nếu không có hoặc đã hết hạn. */
    default Optional<Map<String, String>> loadMeta(UUID id) {
        return Optional.empty();
    }

    void delete(UUID id);
}
