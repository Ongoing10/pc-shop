-- media-service V1. Nội dung file nằm ở Supabase Storage (dev) hoặc ổ đĩa (local); bảng chỉ giữ metadata.
CREATE TABLE files (
    id           BIGSERIAL PRIMARY KEY,
    file_name    VARCHAR(255),
    storage_type INTEGER      NOT NULL,     -- 1-SUPABASE, 2-LOCAL_DISK
    object_key   VARCHAR(500),
    bucket       VARCHAR(100),              -- products, avatars, reviews (public), knowledge-docs (private)
    url          VARCHAR(500),
    file_type    VARCHAR(100),
    mime_type    VARCHAR(100),
    file_size    BIGINT,
    checksum     VARCHAR(64),
    created_by   UUID,
    created_at   TIMESTAMP,
    updated_by   UUID,
    updated_at   TIMESTAMP
);
CREATE INDEX idx_files_bucket ON files (bucket);
