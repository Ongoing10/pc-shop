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
 * </ul>
 * Linh kiện thiếu thông số mà luật cần thì bỏ qua luật đó (không đủ dữ liệu để kết luận).
 */
@ApplicationScoped
public class CompatibilityService {

    public record Issue(String ruleCode, int severity, String message) {
    }

    public record CheckResult(boolean compatible, List<Issue> issues, int estimatedWattage) {
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
        List<Product> parts = skus.stream().map(bySku::get).toList();

        List<Issue> issues = new ArrayList<>();
        int estimatedWattage = sumNumber(parts, "tdp_w");
        for (CompatibilityRule rule : rules.listActive()) {
            switch (rule.ruleType) {
                case "EQUALS", "IN", "LTE" -> checkPairs(rule, parts, issues);
                case "SUM_TDP_LTE_WATTAGE" -> checkWattage(rule, parts, issues);
                default -> throw new BusinessException(ErrorCode.INTERNAL_ERROR,
                        "Luật " + rule.code + " có rule_type không hỗ trợ: " + rule.ruleType);
            }
        }
        boolean compatible = issues.stream().noneMatch(i -> i.severity() == CompatibilityRule.ERROR);
        return new CheckResult(compatible, issues, estimatedWattage);
    }

    private void checkPairs(CompatibilityRule rule, List<Product> parts, List<Issue> issues) {
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

    private void checkWattage(CompatibilityRule rule, List<Product> parts, List<Issue> issues) {
        int total = sumNumber(parts.stream().filter(p -> matches(p, rule.sourceCategory)).toList(), rule.sourceField);
        double margin = rule.margin == null ? 1.0 : rule.margin;
        long required = Math.round(total * margin);
        for (Product psu : distinct(inCategory(parts, rule.targetCategory))) {
            Object wattage = compatValue(psu, rule.targetField);
            if (wattage instanceof Number w && required > w.doubleValue()) {
                issues.add(new Issue(rule.code, severity(rule),
                        render(rule.messageTemplate, "cấu hình", psu.name, String.valueOf(required), display(wattage))));
            }
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
