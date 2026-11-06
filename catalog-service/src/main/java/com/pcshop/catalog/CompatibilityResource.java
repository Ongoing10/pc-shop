package com.pcshop.catalog;

import com.pcshop.contracts.ResponseData;
import jakarta.annotation.security.PermitAll;
import jakarta.inject.Inject;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.Path;

import java.util.List;

/**
 * Kiểm tra tương thích (công khai). Quản trị luật: {@link AdminCompatibilityRuleResource}.
 * Mỗi resource một @Path gốc riêng: Quarkus chọn lớp theo @Path khớp dài nhất rồi mới tìm method trong lớp đó.
 */
@Path("/api/v1/compatibility")
public class CompatibilityResource {

    public record CheckRequest(@NotEmpty @Size(max = 30) List<@NotBlank String> skus) {
    }

    @Inject
    CompatibilityService compatibility;

    /** Body: danh sách SKU (một SKU lặp lại = nhiều chiếc). Trả kết quả của rule engine tất định. */
    @POST
    @Path("/check")
    @PermitAll
    public ResponseData<CompatibilityService.CheckResult> check(@Valid CheckRequest request) {
        return ResponseData.success(compatibility.check(request.skus()));
    }
}
