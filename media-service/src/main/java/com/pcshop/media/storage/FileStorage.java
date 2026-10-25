package com.pcshop.media.storage;

import java.io.InputStream;
import java.nio.file.Path;

/**
 * Nơi lưu file thật. DB (media.files) chỉ giữ metadata.
 * <ul>
 *   <li>profile local: {@link LocalDiskFileStorage} (thư mục trên ổ đĩa)</li>
 *   <li>profile dev: Supabase Storage qua S3 API (TODO: SupabaseFileStorage, xem ghi chú bên dưới)</li>
 * </ul>
 * Không dùng MinIO (plan mục 7.6).
 *
 * <p>Ghi chú khi viết SupabaseFileStorage (AWS SDK v2, artifact software.amazon.awssdk:s3):
 * <pre>
 * S3Client.builder()
 *     .endpointOverride(URI.create(SUPABASE_S3_ENDPOINT))
 *     .region(Region.of(SUPABASE_S3_REGION))
 *     .credentialsProvider(StaticCredentialsProvider.create(AwsBasicCredentials.create(key, secret)))
 *     .forcePathStyle(true)
 *     // Supabase không hỗ trợ header checksum mà SDK bản mới tự gửi → upload sẽ lỗi nếu không tắt
 *     .requestChecksumCalculation(RequestChecksumCalculation.WHEN_REQUIRED)
 *     .responseChecksumValidation(ResponseChecksumValidation.WHEN_REQUIRED)
 *     .build();
 * </pre>
 */
public interface FileStorage {

    /** Kiểu lưu, ghi vào cột media.files.storage_type: 1-SUPABASE, 2-LOCAL_DISK. */
    int storageType();

    void save(String bucket, String key, Path source) throws Exception;

    InputStream open(String bucket, String key) throws Exception;

    void delete(String bucket, String key) throws Exception;

    /** URL để client tải/hiển thị file. */
    String publicUrl(String bucket, String key, long fileId);
}
