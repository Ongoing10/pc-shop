package com.pcshop.inventory;

import com.pcshop.contracts.BusinessException;
import com.pcshop.contracts.ErrorCode;
import com.pcshop.contracts.ResponseData;
import com.pcshop.excel.ExcelHttp;
import com.pcshop.excel.dto.ImportResults.ImportResult;
import com.pcshop.excel.dto.ImportResults.ValidateResult;
import com.pcshop.excel.engine.ExcelReader;
import io.quarkus.security.Authenticated;
import io.smallrye.common.annotation.Blocking;
import jakarta.inject.Inject;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import org.jboss.resteasy.reactive.RestForm;
import org.jboss.resteasy.reactive.multipart.FileUpload;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.file.Files;
import java.util.Locale;
import java.util.UUID;

/**
 * Phiếu nhập kho từ Excel (IMP-2), quyền inventory:write (kiểm tra trong StockExcelService).
 * Gốc riêng /import/excel vì {@code POST /api/v1/admin/inventory/import} (JSON, INV-3) đã có.
 */
@Path("/api/v1/admin/inventory/import/excel")
@Authenticated
@Blocking
public class AdminStockImportResource {

    public record ImportRequest(@NotNull UUID importId) {
    }

    @Inject
    StockExcelService service;

    @GET
    @Path("/template")
    public Response template() {
        return file(service.template());
    }

    @POST
    @Path("/validate")
    @Consumes(MediaType.MULTIPART_FORM_DATA)
    public ResponseData<ValidateResult> validate(@RestForm("file") FileUpload file,
                                                 @RestForm("referenceCode") String referenceCode) {
        return ResponseData.success(service.validate(bytes(file), referenceCode));
    }

    @GET
    @Path("/{importId}/result-file")
    public Response resultFile(@PathParam("importId") UUID importId) {
        return file(service.resultFile(importId));
    }

    @POST
    public ResponseData<ImportResult> importFile(@Valid ImportRequest request) {
        return ResponseData.success(service.importFile(request.importId()));
    }

    static Response file(StockExcelService.ExcelFile file) {
        return Response.ok(file.content())
                .type(ExcelHttp.XLSX)
                .header("Content-Disposition", ExcelHttp.contentDisposition(file.filename()))
                .build();
    }

    /** File upload: bắt buộc, đuôi .xlsx, tối đa 5 MB (kiểm tra trước khi đọc vào RAM). */
    private static byte[] bytes(FileUpload file) {
        if (file == null || file.uploadedFile() == null) {
            throw new BusinessException(ErrorCode.BAD_REQUEST, "Thiếu file (form-data key \"file\")");
        }
        String name = file.fileName() == null ? "" : file.fileName().toLowerCase(Locale.ROOT);
        if (!name.endsWith(".xlsx")) {
            throw new BusinessException(ErrorCode.BAD_REQUEST, "Chỉ nhận file Excel .xlsx");
        }
        if (file.size() > ExcelReader.DEFAULT_MAX_BYTES) {
            throw new BusinessException(ErrorCode.BAD_REQUEST, "File vượt quá 5 MB");
        }
        try {
            return Files.readAllBytes(file.uploadedFile());
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
    }
}
