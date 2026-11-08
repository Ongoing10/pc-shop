package com.pcshop.catalog;

import com.pcshop.contracts.BusinessException;
import com.pcshop.contracts.ErrorCode;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import org.bson.Document;

import java.util.ArrayList;
import java.util.Collection;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * Rule engine tương thích TẤT ĐỊNH: chỉ đọc compatibility_rules + products.compat, không dùng LLM.
 * Cùng một danh sách linh kiện luôn cho cùng một kết quả; LLM (ai-service) chỉ diễn giải kết quả này.
 *
 * <p>Kiểu luật:
 * <ul>
 *   <li>EQUALS: giá trị nguồn bằng giá trị đích; nếu một bên là mảng thì chỉ cần có phần tử chung
 *       (vd CPU khai memory_types ["DDR4","DDR5"])</li>
 *   <li>IN: giá trị nguồn nằm trong mảng ở đích (vd form_factor mainboard ∈ supported_form_factors của case)</li>
 *   <li>LTE: số ở nguồn ≤ số ở đích (vd length_mm VGA ≤ max_gpu_length_mm case)</li>
 *   <li>SUM_TDP_LTE_WATTAGE: tổng source_field của mọi linh kiện × margin ≤ target_field của nguồn</li>
 *   <li>SUM_LTE: tổng source_field của các linh kiện thuộc source_category ≤ target_field của từng linh kiện
 *       đích (vd tổng số thanh RAM ≤ ram_slots của mainboard)</li>
 *   <li>MAX_COUNT: số linh kiện thuộc source_category ≤ max_count (vd chỉ một CPU, một mainboard)</li>
 * </ul>
 * Linh kiện thiếu thông số mà luật cần thì bỏ qua luật đó (không đủ dữ liệu để kết luận).
 */
@ApplicationScoped
public class CompatibilityService {

    public static final Set<String> RULE_TYPES =
            Set.of("EQUALS", "IN", "LTE", "SUM_TDP_LTE_WATTAGE", "SUM_LTE", "MAX_COUNT");

    public record Issue(String ruleCode, int severity, String message) {
    }

    /**
     * @param estimatedWattage tổng TDP các linh kiện (chưa nhân hệ số)
     * @param requiredWattage  công suất nguồn tối thiểu = estimatedWattage × margin của luật SUM_TDP_LTE_WATTAGE đang bật
     *                         (không có luật đó thì bằng estimatedWattage); đây là số mà luật PSU_WATTAGE so với nguồn
     */
    public record CheckResult(boolean compatible, List<Issue> issues, int estimatedWattage, int requiredWattage) {
    }

    @Inject
    CatalogRepositories.ProductRepository products;

    @Inject
    CatalogRepositories.CompatibilityRuleRepository rules;

    /**
     * @param skus danh sách SKU; một SKU xuất hiện nhiều lần = nhiều chiếc (vd 2 kit RAM), tính cả vào tổng công suất
     */
    public CheckResult check(List<String> skus) {
        Map<String, Product> bySku = products.findBySkus(new LinkedHashSet<>(skus)).stream()
                .filter(p -> p.status != null && p.status == Product.ACTIVE)
                .collect(Collectors.toMap(p -> p.sku, Function.identity()));
        List<String> missing = skus.stream().filter(s -> !bySku.containsKey(s)).distinct().toList();
        if (!missing.isEmpty()) {
            throw new BusinessException(ErrorCode.NOT_FOUND, "Không tìm thấy sản phẩm đang bán: " + missing);
        }
        return evaluate(skus.stream().map(bySku::get).toList(), rules.listActive());
    }

    /** Phần tính toán thuần (không đọc DB), tách ra để unit test. */
    static CheckResult evaluate(List<Product> parts, List<CompatibilityRule> activeRules) {
        List<Issue> issues = new ArrayList<>();
        int estimatedWattage = sumNumber(parts, "tdp_w");
        int requiredWattage = estimatedWattage;
        for (CompatibilityRule rule : activeRules) {
            if ("SUM_TDP_LTE_WATTAGE".equals(rule.ruleType)) {
                requiredWattage = (int) required(rule, parts);
            }
            switch (rule.ruleType) {
                case "EQUALS", "IN", "LTE" -> checkPairs(rule, parts, issues);
                case "SUM_TDP_LTE_WATTAGE" -> checkWattage(rule, parts, issues);
                case "SUM_LTE" -> checkSum(rule, parts, issues);
                case "MAX_COUNT" -> checkCount(rule, parts, issues);
                default -> throw new BusinessException(ErrorCode.INTERNAL_ERROR,
                        "Luật " + rule.code + " có rule_type không hỗ trợ: " + rule.ruleType);
            }
        }
        boolean compatible = issues.stream().noneMatch(i -> i.severity() == CompatibilityRule.ERROR);
        return new CheckResult(compatible, issues, estimatedWattage, requiredWattage);
    }

    private static void checkPairs(CompatibilityRule rule, List<Product> parts, List<Issue> issues) {
        List<Product> sources = distinct(inCategory(parts, rule.sourceCategory));
        List<Product> targets = distinct(inCategory(parts, rule.targetCategory));
        for (Product source : sources) {
            for (Product target : targets) {
                if (source == target) {
                    continue;
                }
                Object sv = compatValue(source, rule.sourceField);
                Object tv = compatValue(target, rule.targetField);
                if (sv == null || tv == null) {
                    continue;
                }
                boolean ok = switch (rule.ruleType) {
                    case "EQUALS" -> overlaps(sv, tv);
                    case "IN" -> tv instanceof Collection<?> list
                            ? list.stream().anyMatch(v -> Objects.equals(str(v), str(sv)))
                            : Objects.equals(str(sv), str(tv));
                    default -> lte(sv, tv);
                };
                if (!ok) {
                    issues.add(new Issue(rule.code, severity(rule),
                            render(rule.messageTemplate, source.name, target.name, display(sv), display(tv))));
                }
            }
        }
    }

    /** Tổng source_field của nhóm nguồn × margin (công suất nguồn cần có). */
    private static long required(CompatibilityRule rule, List<Product> parts) {
        int total = sumNumber(inCategory(parts, rule.sourceCategory), rule.sourceField);
        double margin = rule.margin == null ? 1.0 : rule.margin;
        return Math.round(total * margin);
    }

    private static void checkWattage(CompatibilityRule rule, List<Product> parts, List<Issue> issues) {
        long required = required(rule, parts);
        for (Product psu : distinct(inCategory(parts, rule.targetCategory))) {
            Object wattage = compatValue(psu, rule.targetField);
            if (wattage instanceof Number w && required > w.doubleValue()) {
                issues.add(new Issue(rule.code, severity(rule),
                        render(rule.messageTemplate, "cấu hình", psu.name, String.valueOf(required), display(wattage))));
            }
        }
    }

    /** Tổng của nhóm nguồn so với sức chứa của từng linh kiện đích; nhóm nguồn không khai thông số thì bỏ qua. */
    private static void checkSum(CompatibilityRule rule, List<Product> parts, List<Issue> issues) {
        List<Product> sources = inCategory(parts, rule.sourceCategory).stream()
                .filter(p -> compatValue(p, rule.sourceField) instanceof Number).toList();
        if (sources.isEmpty()) {
            return;
        }
        int total = sumNumber(sources, rule.sourceField);
        for (Product target : distinct(inCategory(parts, rule.targetCategory))) {
            Object capacity = compatValue(target, rule.targetField);
            if (capacity instanceof Number c && total > c.doubleValue()) {
                issues.add(new Issue(rule.code, severity(rule),
                        render(rule.messageTemplate, rule.sourceCategory, target.name, String.valueOf(total),
                                display(capacity))));
            }
        }
    }

    private static void checkCount(CompatibilityRule rule, List<Product> parts, List<Issue> issues) {
        if (rule.maxCount == null) {
            return;
        }
        int count = inCategory(parts, rule.sourceCategory).size();
        if (count > rule.maxCount) {
            issues.add(new Issue(rule.code, severity(rule),
                    render(rule.messageTemplate, rule.sourceCategory, "cấu hình", String.valueOf(count),
                            String.valueOf(rule.maxCount))));
        }
    }

    // ------------------------------------------------------------------

    private static List<Product> inCategory(List<Product> parts, String category) {
        return parts.stream().filter(p -> matches(p, category)).toList();
    }

    private static boolean matches(Product p, String category) {
        return "*".equals(category) || Objects.equals(p.categoryCode, category);
    }

    private static List<Product> distinct(List<Product> parts) {
        return new ArrayList<>(new LinkedHashSet<>(parts));
    }

    private static Object compatValue(Product p, String field) {
        Document compat = p.compat;
        return compat == null || field == null ? null : compat.get(field);
    }

    private static int sumNumber(List<Product> parts, String field) {
        return parts.stream()
                .map(p -> compatValue(p, field))
                .filter(Number.class::isInstance)
                .mapToInt(v -> ((Number) v).intValue())
                .sum();
    }

    private static boolean overlaps(Object a, Object b) {
        Collection<?> left = a instanceof Collection<?> c ? c : List.of(a);
        Collection<?> right = b instanceof Collection<?> c ? c : List.of(b);
        return left.stream().anyMatch(x -> right.stream().anyMatch(y -> Objects.equals(str(x), str(y))));
    }

    private static boolean lte(Object a, Object b) {
        if (a instanceof Number x && b instanceof Number y) {
            return x.doubleValue() <= y.doubleValue();
        }
        return true;   // không phải số: không đủ dữ liệu để kết luận
    }

    private static int severity(CompatibilityRule rule) {
        return rule.severity == null ? CompatibilityRule.ERROR : rule.severity;
    }

    private static String str(Object v) {
        return v == null ? null : v.toString().trim().toUpperCase();
    }

    private static String display(Object v) {
        return v instanceof Collection<?> c
                ? c.stream().map(String::valueOf).collect(Collectors.joining("/"))
                : String.valueOf(v);
    }

    private static String render(String template, String source, String target, String sv, String tv) {
        String t = template == null ? "{source} không tương thích {target}" : template;
        return t.replace("{source}", source).replace("{target}", target).replace("{sv}", sv).replace("{tv}", tv);
    }
}
