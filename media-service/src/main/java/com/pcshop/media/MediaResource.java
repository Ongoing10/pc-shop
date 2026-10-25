package com.pcshop.media;

import com.pcshop.contracts.BusinessException;
import com.pcshop.contracts.ErrorCode;
import com.pcshop.contracts.ResponseData;
import com.pcshop.media.storage.FileStorage;
import io.quarkus.hibernate.orm.panache.PanacheRepository;
import io.quarkus.security.Authenticated;
import jakarta.annotation.security.PermitAll;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import org.jboss.resteasy.reactive.RestForm;
import org.jboss.resteasy.reactive.multipart.FileUpload;

import java.util.Set;
import java.util.UUID;

/**
 * Upload đi qua service: client → media-service → storage (không dùng presigned URL từ trình duyệt,
 * tránh lỗi CORS; plan mục 7.6).
 */
@Path("/api/v1/media")
public class MediaResource {

    private static final Set<String> BUCKETS = Set.of("products", "avatars", "reviews", "knowledge-docs");

    @ApplicationScoped
    public static class MediaFileRepository implements PanacheRepository<MediaFile> {
    }

    @Inject
    FileStorage storage;

    @Inject
    MediaFileRepository files;

    @POST
    @Path("/upload")
    @Authenticated
    @Consumes(MediaType.MULTIPART_FORM_DATA)
    @Transactional
    public ResponseData<MediaFile> upload(@RestForm("file") FileUpload file, @RestForm("bucket") String bucket)
            throws Exception {
        if (file == null || !BUCKETS.contains(bucket)) {
            throw new BusinessException(ErrorCode.BAD_REQUEST, "Thiếu file hoặc bucket không hợp lệ " + BUCKETS);
        }
        String key = UUID.randomUUID() + extension(file.fileName());
        storage.save(bucket, key, file.uploadedFile());

        MediaFile meta = new MediaFile();
        meta.fileName = file.fileName();
        meta.storageType = storage.storageType();
        meta.objectKey = key;
        meta.bucket = bucket;
        meta.mimeType = file.contentType();
        meta.fileSize = file.size();
        files.persist(meta);
        files.flush();                                   // cần id để tạo URL
        meta.url = storage.publicUrl(bucket, key, meta.id);
        return ResponseData.success(meta);
    }

    /** Phục vụ file lưu trên ổ đĩa (profile local). Bucket private thì cần kiểm tra quyền (TODO). */
    @GET
    @Path("/files/{id}")
    @PermitAll
    public Response download(@PathParam("id") long id) throws Exception {
        MediaFile meta = files.findByIdOptional(id).orElseThrow(() -> BusinessException.notFound("file", id));
        if ("knowledge-docs".equals(meta.bucket)) {
            throw BusinessException.forbidden("File nội bộ");
        }
        return Response.ok(storage.open(meta.bucket, meta.objectKey), meta.mimeType)
                .header("Content-Disposition", "inline; filename=\"" + meta.fileName + "\"")
                .build();
    }

    private static String extension(String name) {
        int dot = name == null ? -1 : name.lastIndexOf('.');
        return dot < 0 ? "" : name.substring(dot).toLowerCase();
    }
}
