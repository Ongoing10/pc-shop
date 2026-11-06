package com.pcshop.catalog;

import com.pcshop.common.quarkus.CurrentUser;
import com.pcshop.contracts.BulkErrors;
import com.pcshop.contracts.BusinessException;
import com.pcshop.contracts.ErrorCode;
import com.pcshop.contracts.ResponseData;
import io.quarkus.security.Authenticated;
import jakarta.inject.Inject;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Positive;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.PATCH;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.PUT;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;

import java.time.Instant;
import java.util.List;
import java.util.Set;

/**
 * Quản trị luật tương thích (permission product:write).
 * Không có DELETE: collection dùng is_active, "xóa" = PATCH .../active.
 */
@Path("/api/v1/admin/compatibility-rules")
@Authenticated
public class AdminCompatibilityRuleResource {

    private static final Set<String> RULE_TYPES = Set.of("EQUALS", "IN", "LTE", "SUM_TDP_LTE_WATTAGE");

    public record RuleRequest(@NotBlank @Pattern(regexp = "^[A-Z0-9_]+$", message = "Mã chỉ gồm A-Z, 0-9, _") String code,
                              @NotBlank String name, @NotBlank String sourceCategory, @NotBlank String targetCategory,
                              @NotBlank String ruleType, @NotBlank String sourceField, @NotBlank String targetField,
                              @Positive Double margin, @NotNull @Min(1) @Max(2) Integer severity,
                              @NotBlank String messageTemplate) {
    }

    public record UpdateRuleRequest(@NotBlank String name, @NotBlank String sourceCategory,
                                    @NotBlank String targetCategory, @NotBlank String ruleType,
                                    @NotBlank String sourceField, @NotBlank String targetField,
                                    @Positive Double margin, @NotNull @Min(1) @Max(2) Integer severity,
                                    @NotBlank String messageTemplate) {
    }

    public record ActiveRequest(@NotNull Boolean active) {
    }

    public record BulkActiveRequest(@NotEmpty List<String> codes, @NotNull Boolean active) {
    }

    @Inject
    CatalogRepositories.CompatibilityRuleRepository rules;

    @Inject
    CurrentUser currentUser;

    @GET
    public ResponseData<List<CompatibilityRule>> list() {
        currentUser.requirePermission("product:write");
        return ResponseData.success(rules.listAllSorted());
    }

    @GET
    @Path("/{code}")
    public ResponseData<CompatibilityRule> detail(@PathParam("code") String code) {
        currentUser.requirePermission("product:write");
        return ResponseData.success(find(code));
    }

    @POST
    public ResponseData<CompatibilityRule> create(@Valid RuleRequest r) {
        currentUser.requirePermission("product:write");
        if (rules.findByCode(r.code()).isPresent()) {
            throw new BusinessException(ErrorCode.CONFLICT, "Mã luật đã tồn tại: " + r.code());
        }
        CompatibilityRule rule = new CompatibilityRule();
        rule.code = r.code();
        apply(rule, r.name(), r.sourceCategory(), r.targetCategory(), r.ruleType(), r.sourceField(),
                r.targetField(), r.margin(), r.severity(), r.messageTemplate());
        rule.isActive = 1;
        rule.createdAt = Instant.now();
        rule.updatedAt = rule.createdAt;
        rules.persist(rule);
        return ResponseData.success(rule);
    }

    @PUT
    @Path("/{code}")
    public ResponseData<CompatibilityRule> update(@PathParam("code") String code, @Valid UpdateRuleRequest r) {
        currentUser.requirePermission("product:write");
        CompatibilityRule rule = find(code);
        apply(rule, r.name(), r.sourceCategory(), r.targetCategory(), r.ruleType(), r.sourceField(),
                r.targetField(), r.margin(), r.severity(), r.messageTemplate());
        rule.updatedAt = Instant.now();
        rules.update(rule);
        return ResponseData.success(rule);
    }

    @PATCH
    @Path("/{code}/active")
    public ResponseData<CompatibilityRule> setActive(@PathParam("code") String code, @Valid ActiveRequest request) {
        currentUser.requirePermission("product:write");
        CompatibilityRule rule = find(code);
        rule.isActive = request.active() ? 1 : 0;
        rule.updatedAt = Instant.now();
        rules.update(rule);
        return ResponseData.success(rule);
    }

    @PATCH
    @Path("/bulk/active")
    public ResponseData<List<CompatibilityRule>> setActiveBulk(@Valid BulkActiveRequest request) {
        currentUser.requirePermission("product:write");
        BulkErrors errors = BulkErrors.check(request.codes());
        List<CompatibilityRule> found = rules.findByCodes(request.codes());
        AdminCatalogResource.missing(request.codes(), found.stream().map(r -> r.code).toList(), errors);
        errors.throwIfAny();
        Instant now = Instant.now();
        for (CompatibilityRule rule : found) {
            rule.isActive = request.active() ? 1 : 0;
            rule.updatedAt = now;
        }
        rules.update(found);
        return ResponseData.success(found);
    }

    private static void apply(CompatibilityRule rule, String name, String sourceCategory, String targetCategory,
                              String ruleType, String sourceField, String targetField, Double margin,
                              Integer severity, String messageTemplate) {
        if (!RULE_TYPES.contains(ruleType)) {
            throw new BusinessException(ErrorCode.BAD_REQUEST, "rule_type phải là một trong " + RULE_TYPES);
        }
        rule.name = name;
        rule.sourceCategory = sourceCategory;
        rule.targetCategory = targetCategory;
        rule.ruleType = ruleType;
        rule.sourceField = sourceField;
        rule.targetField = targetField;
        rule.margin = margin;
        rule.severity = severity;
        rule.messageTemplate = messageTemplate;
    }

    private CompatibilityRule find(String code) {
        return rules.findByCode(code).orElseThrow(() -> BusinessException.notFound("luật tương thích", code));
    }
}
