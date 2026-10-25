package com.pcshop.media;

import com.pcshop.common.quarkus.AuditableEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/** Metadata file (bảng media.files). Nội dung file nằm ở FileStorage, không lưu bytea trong DB. */
@Entity
@Table(name = "files")
public class MediaFile extends AuditableEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    public Long id;

    @Column(name = "file_name")
    public String fileName;

    /** 1-SUPABASE, 2-LOCAL_DISK */
    @Column(name = "storage_type")
    public int storageType;

    @Column(name = "object_key")
    public String objectKey;

    public String bucket;

    public String url;

    @Column(name = "mime_type")
    public String mimeType;

    @Column(name = "file_size")
    public long fileSize;

    public String checksum;
}
