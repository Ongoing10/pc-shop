package com.pcshop.media.storage;

import jakarta.enterprise.context.ApplicationScoped;
import org.eclipse.microprofile.config.inject.ConfigProperty;

import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;

/** Lưu file ra thư mục trên ổ đĩa (profile local). File được phục vụ lại qua GET /api/v1/media/files/{id}. */
@ApplicationScoped
public class LocalDiskFileStorage implements FileStorage {

    @ConfigProperty(name = "pcshop.storage.local-dir", defaultValue = "../data/uploads")
    String baseDir;

    @ConfigProperty(name = "pcshop.public-base-url", defaultValue = "http://localhost:8000")
    String publicBaseUrl;

    @Override
    public int storageType() {
        return 2;
    }

    @Override
    public void save(String bucket, String key, Path source) throws Exception {
        Path target = resolve(bucket, key);
        Files.createDirectories(target.getParent());
        Files.copy(source, target, StandardCopyOption.REPLACE_EXISTING);
    }

    @Override
    public InputStream open(String bucket, String key) throws Exception {
        return Files.newInputStream(resolve(bucket, key));
    }

    @Override
    public void delete(String bucket, String key) throws Exception {
        Files.deleteIfExists(resolve(bucket, key));
    }

    @Override
    public String publicUrl(String bucket, String key, long fileId) {
        return publicBaseUrl + "/api/v1/media/files/" + fileId;
    }

    private Path resolve(String bucket, String key) {
        Path root = Path.of(baseDir).toAbsolutePath().normalize();
        Path target = root.resolve(bucket).resolve(key).normalize();
        if (!target.startsWith(root)) {                       // chặn key kiểu "../../etc/passwd"
            throw new IllegalArgumentException("Đường dẫn file không hợp lệ");
        }
        return target;
    }
}
