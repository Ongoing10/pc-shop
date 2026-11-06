package com.pcshop.excel.store;

import java.io.IOException;
import java.io.Reader;
import java.io.UncheckedIOException;
import java.io.Writer;
import java.nio.charset.StandardCharsets;
import java.nio.file.DirectoryStream;
import java.nio.file.Files;
import java.nio.file.NoSuchFileException;
import java.nio.file.Path;
import java.time.Duration;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Optional;
import java.util.Properties;
import java.util.UUID;

/**
 * Lưu file import ở một thư mục, tự xóa file quá hạn mỗi lần lưu file mới.
 * Metadata (nếu có) nằm ở {@code <id>.properties} cạnh {@code <id>.xlsx}.
 * Chuyển từ TempDirImportFileStore của common-reactive: bỏ Reactor/Lombok, giữ nguyên logic.
 */
public class TempDirImportStore implements ImportStore {

    private static final System.Logger LOG = System.getLogger(TempDirImportStore.class.getName());

    private final Path directory;
    private final Duration ttl;

    public TempDirImportStore(Path directory, Duration ttl) {
        this.directory = directory;
        this.ttl = ttl;
    }

    @Override
    public UUID save(byte[] content) {
        return save(content, Map.of());
    }

    @Override
    public UUID save(byte[] content, Map<String, String> meta) {
        try {
            Files.createDirectories(directory);
            cleanupExpired();
            UUID id = UUID.randomUUID();
            Files.write(path(id), content);
            if (meta != null && !meta.isEmpty()) {
                Properties props = new Properties();
                meta.forEach((k, v) -> {
                    if (v != null) {
                        props.setProperty(k, v);
                    }
                });
                try (Writer writer = Files.newBufferedWriter(metaPath(id), StandardCharsets.UTF_8)) {
                    props.store(writer, null);
                }
            }
            return id;
        } catch (IOException ex) {
            throw new UncheckedIOException("Không lưu được file import", ex);
        }
    }

    @Override
    public Optional<byte[]> load(UUID id) {
        Path file = path(id);
        try {
            if (!Files.exists(file) || isExpired(file)) {
                return Optional.empty();
            }
            return Optional.of(Files.readAllBytes(file));
        } catch (NoSuchFileException ex) {
            return Optional.empty();
        } catch (IOException ex) {
            throw new UncheckedIOException("Không đọc được file import", ex);
        }
    }

    @Override
    public Optional<Map<String, String>> loadMeta(UUID id) {
        Path file = path(id);
        Path meta = metaPath(id);
        try {
            if (!Files.exists(file) || isExpired(file) || !Files.exists(meta)) {
                return Optional.empty();
            }
            Properties props = new Properties();
            try (Reader reader = Files.newBufferedReader(meta, StandardCharsets.UTF_8)) {
                props.load(reader);
            }
            Map<String, String> result = new LinkedHashMap<>();
            props.stringPropertyNames().forEach(k -> result.put(k, props.getProperty(k)));
            return Optional.of(result);
        } catch (NoSuchFileException ex) {
            return Optional.empty();
        } catch (IOException ex) {
            throw new UncheckedIOException("Không đọc được metadata của file import", ex);
        }
    }

    @Override
    public void delete(UUID id) {
        try {
            Files.deleteIfExists(path(id));
            Files.deleteIfExists(metaPath(id));
        } catch (IOException ex) {
            LOG.log(System.Logger.Level.WARNING, "Không xóa được file import {0}: {1}", id, ex.getMessage());
        }
    }

    private Path path(UUID id) {
        // UUID chỉ gồm hex và '-', không đi ra ngoài thư mục được
        return directory.resolve(id + ".xlsx");
    }

    private Path metaPath(UUID id) {
        return directory.resolve(id + ".properties");
    }

    private boolean isExpired(Path file) throws IOException {
        Instant modified = Files.getLastModifiedTime(file).toInstant();
        return modified.plus(ttl).isBefore(Instant.now());
    }

    private void cleanupExpired() {
        try (DirectoryStream<Path> files = Files.newDirectoryStream(directory, "*.{xlsx,properties}")) {
            for (Path file : files) {
                if (isExpired(file)) {
                    Files.deleteIfExists(file);
                }
            }
        } catch (IOException ex) {
            LOG.log(System.Logger.Level.DEBUG, "Dọn file import quá hạn lỗi: {0}", ex.getMessage());
        }
    }
}
