package com.pcshop.media;

import com.pcshop.common.quarkus.CurrentUser;
import com.pcshop.contracts.AuthUser;
import com.pcshop.contracts.BulkErrors;
import com.pcshop.contracts.BusinessException;
import com.pcshop.contracts.ErrorCode;
import com.pcshop.contracts.ResponseData;
import com.pcshop.media.storage.FileStorage;
import io.quarkus.hibernate.orm.panache.PanacheRepository;
import io.quarkus.narayana.jta.QuarkusTransaction;
import io.quarkus.security.Authenticated;
import jakarta.annotation.security.PermitAll;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;
import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.DELETE;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import org.jboss.logging.Logger;
import org.jboss.resteasy.reactive.RestForm;
import org.jboss.resteasy.reactive.multipart.FileUpload;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;

/**
 * Upload đi qua service: client → media-service → storage (không dùng presigned URL từ trình duyệt,
 * tránh lỗi CORS; plan mục 7.6). Quyền upload, loại file và dung lượng theo từng bucket: {@link BucketPolicy}.
 */
@Path("/api/v1/media")
public class MediaResource {

    private static final Logger log = Logger.getLogger(MediaResource.class);

    public record BulkDeleteRequest(@NotEmpty @Size(max = BulkErrors.MAX_ITEMS) List<Long> ids) {
    }

    @ApplicationScoped
    public static class MediaFileRepository implements PanacheRepository<MediaFile> {
    }

    @Inject
    FileStorage storage;

    @Inject
    MediaFileRepository files;

    @Inject
    CurrentUser currentUser;

    @POST
    @Path("/upload")
    @Authenticated
    @Consumes(MediaType.MULTIPART_FORM_DATA)
    @Transactional
    public ResponseData<MediaFile> upload(@RestForm("file") FileUpload file, @RestForm("bucket") String bucket)
            throws Exception {
        BucketPolicy policy = bucket == null ? null : BucketPolicy.ALL.get(bucket);
        if (file == null || file.uploadedFile() == null || policy == null) {
            throw new BusinessException(ErrorCode.BAD_REQUEST,
                    "Thiếu file hoặc bucket không hợp lệ " + BucketPolicy.ALL.keySet());
        }
        if (!policy.canUpload().test(currentUser.require())) {
            throw BusinessException.forbidden("Bạn không được upload vào bucket " + bucket);
        }
        String extension = extension(file.fileName());
        String mimeType = policy.mimeOf(extension).orElseThrow(() -> new BusinessException(ErrorCode.BAD_REQUEST,
                "Bucket " + bucket + " chỉ nhận file " + policy.mimeByExtension().keySet()));
        if (file.size() > policy.maxBytes()) {
            throw new BusinessException(ErrorCode.BAD_REQUEST,
                    "File vượt quá " + policy.maxBytes() / (1024 * 1024) + " MB");
        }
        String key = UUID.randomUUID() + extension;
        storage.save(bucket, key, file.uploadedFile());

        MediaFile meta = new MediaFile();
        meta.fileName = file.fileName();
        meta.storageType = storage.storageType();
        meta.objectKey = key;
        meta.bucket = bucket;
        meta.mimeType = mimeType;
        meta.fileSize = file.size();
        files.persist(meta);
        files.flush();                                   // cần id để tạo URL
        meta.url = storage.publicUrl(bucket, key, meta.id);
        return ResponseData.success(meta);
    }

    /** Phục vụ file lưu trên ổ đĩa (profile local); đây là URL lưu trong cột url (dùng cho thẻ img). */
    @GET
    @Path("/files/{id}")
    @PermitAll
    public Response download(@PathParam("id") long id) throws Exception {
        MediaFile meta = readable(id);
        return fileResponse(meta).build();
    }

    /**
     * Nội dung file dạng blob cho frontend: {@code fetch(url, {headers: {Authorization}})} → {@code .blob()}
     * → {@code URL.createObjectURL}. Bucket công khai không cần token; bucket nội bộ cần ADMIN hoặc knowledge:write.
     */
    @GET
    @Path("/files/{id}/view")
    @PermitAll
    public Response view(@PathParam("id") long id) throws Exception {
        MediaFile meta = readable(id);
        return fileResponse(meta).header("Content-Length", meta.fileSize).build();
    }

    /** Metadata của file (tên, loại, dung lượng, bucket, url). */
    @GET
    @Path("/files/{id}/info")
    @PermitAll
    public ResponseData<MediaFile> info(@PathParam("id") long id) {
        return ResponseData.success(readable(id));
    }

    /**
     * Xóa thật bản ghi + file trong storage (người upload hoặc ADMIN). Xóa bản ghi trước rồi mới xóa file:
     * xóa file lỗi thì exception làm rollback, bản ghi còn nguyên.
     * Lưu ý: service đang tham chiếu file (avatar_file_id, images của sản phẩm) không tự được dọn, bên gọi tự gỡ trước.
     */
    @DELETE
    @Path("/files/{id}")
    @Authenticated
    @Transactional
    public ResponseData<Void> delete(@PathParam("id") long id) throws Exception {
        AuthUser user = currentUser.require();
        MediaFile meta = files.findByIdOptional(id).orElseThrow(() -> BusinessException.notFound("file", id));
        if (!user.id().equals(meta.createdBy) && !user.hasRole("ADMIN")) {
            throw BusinessException.forbidden("Chỉ người upload hoặc ADMIN được xóa file này");
        }
        files.delete(meta);
        files.flush();
        storage.delete(meta.bucket, meta.objectKey);
        return ResponseData.success(null);
    }

    /**
     * Xóa thật nhiều file (người upload hoặc ADMIN), "tất cả hoặc không" với bản ghi: xóa bản ghi trong một
     * transaction, commit xong mới xóa file trong storage; file nào xóa lỗi thì chỉ log (bản ghi đã mất, file mồ côi).
     */
    @POST
    @Path("/files/bulk-delete")
    @Authenticated
    public ResponseData<Map<String, Integer>> deleteAll(@Valid BulkDeleteRequest request) {
        AuthUser user = currentUser.require();
        BulkErrors errors = BulkErrors.check(request.ids());
        List<MediaFile> deleted = QuarkusTransaction.requiringNew().call(() -> {
            List<MediaFile> found = files.list("id in ?1", request.ids());
            request.ids().stream().filter(id -> found.stream().noneMatch(f -> f.id.equals(id)))
                    .forEach(id -> errors.add(id, "Không tìm thấy file"));
            found.stream().filter(f -> !user.id().equals(f.createdBy) && !user.hasRole("ADMIN"))
                    .forEach(f -> errors.add(f.id, "Chỉ người upload hoặc ADMIN được xóa file này"));
            errors.throwIfAny();
            found.forEach(files::delete);
            return found;
        });
        for (MediaFile meta : deleted) {
            try {
                storage.delete(meta.bucket, meta.objectKey);
            } catch (Exception e) {
                log.errorf(e, "Đã xóa bản ghi file %d nhưng không xóa được %s/%s trong storage",
                        meta.id, meta.bucket, meta.objectKey);
            }
        }
        return ResponseData.success(Map.of("deleted", deleted.size()));
    }

    /** File tồn tại và người gọi được xem (bucket nội bộ: ADMIN hoặc knowledge:write). */
    private MediaFile readable(long id) {
        MediaFile meta = files.findByIdOptional(id).orElseThrow(() -> BusinessException.notFound("file", id));
        BucketPolicy policy = BucketPolicy.ALL.get(meta.bucket);
        if ((policy == null || policy.internal())
                && currentUser.get().filter(BucketPolicy::canManageKnowledge).isEmpty()) {
            throw BusinessException.forbidden("File nội bộ");
        }
        return meta;
    }

    /**
     * Header chung khi trả nội dung file. MIME tính lại theo đuôi của object key (file cũ upload trước khi có
     * BucketPolicy có thể mang Content-Type tùy ý): đuôi không được phép thì trả dạng tải về, không hiển thị inline.
     */
    private Response.ResponseBuilder fileResponse(MediaFile meta) throws Exception {
        BucketPolicy policy = BucketPolicy.ALL.get(meta.bucket);
        String mime = policy == null ? null : policy.mimeOf(extension(meta.objectKey)).orElse(null);
        boolean internal = policy == null || policy.internal();
        return Response.ok(storage.open(meta.bucket, meta.objectKey),
                        mime == null ? MediaType.APPLICATION_OCTET_STREAM : mime)
                .header("Content-Disposition", contentDisposition(mime == null ? "attachment" : "inline", meta.fileName))
                .header("X-Content-Type-Options", "nosniff")
                .header("Cache-Control", internal ? "private, max-age=300" : "public, max-age=86400");
    }

    /** Tên file người dùng đặt: bỏ ký tự phá header (", \, xuống dòng), kèm filename* UTF-8 cho tên tiếng Việt. */
    static String contentDisposition(String type, String fileName) {
        String name = fileName == null || fileName.isBlank() ? "file" : fileName;
        String ascii = name.replaceAll("[^\\x20-\\x7E]", "_").replaceAll("[\"\\\\]", "_");
        String encoded = URLEncoder.encode(name, StandardCharsets.UTF_8).replace("+", "%20");
        return type + "; filename=\"" + ascii + "\"; filename*=UTF-8''" + encoded;
    }

    private static String extension(String name) {
        int dot = name == null ? -1 : name.lastIndexOf('.');
        return dot < 0 ? "" : name.substring(dot).toLowerCase(Locale.ROOT);
    }
}
