package com.pcshop.catalog;

import org.bson.Document;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

/** Rule engine thuần (CompatibilityService.evaluate), không cần Mongo. Luật giống seed trong changelog. */
class CompatibilityServiceTest {

    private static Product part(String category, String name, Map<String, Object> compat) {
        Product p = new Product();
        p.categoryCode = category;
        p.name = name;
        p.sku = name;
        p.compat = new Document(compat);
        return p;
    }

    private static CompatibilityRule rule(String code, String type, String source, String target,
                                          String sourceField, String targetField) {
        CompatibilityRule r = new CompatibilityRule();
        r.code = code;
        r.ruleType = type;
        r.sourceCategory = source;
        r.targetCategory = target;
        r.sourceField = sourceField;
        r.targetField = targetField;
        r.severity = CompatibilityRule.ERROR;
        r.messageTemplate = "{source} / {target}: {sv} vs {tv}";
        return r;
    }

    private static CompatibilityRule maxCount(String code, String category, int max) {
        CompatibilityRule r = rule(code, "MAX_COUNT", category, null, null, null);
        r.maxCount = max;
        return r;
    }

    private static final Product CPU_INTEL = part("CPU", "i5", Map.of("socket", "LGA1700", "memory_types",
            List.of("DDR4", "DDR5"), "tdp_w", 125));
    private static final Product MB_AM5 = part("MAINBOARD", "B650", Map.of("socket", "AM5", "memory_type", "DDR5",
            "ram_slots", 2));
    private static final Product MB_LGA = part("MAINBOARD", "B760", Map.of("socket", "LGA1700", "memory_type", "DDR5",
            "ram_slots", 4));
    private static final Product RAM_KIT = part("RAM", "kit", Map.of("memory_type", "DDR5", "modules", 2));
    private static final Product PSU_500 = part("PSU", "psu500", Map.of("wattage", 500));
    private static final Product GPU = part("GPU", "4070", Map.of("tdp_w", 320));

    @Test
    void socketMismatchIsError() {
        var result = CompatibilityService.evaluate(List.of(CPU_INTEL, MB_AM5),
                List.of(rule("CPU_MB_SOCKET", "EQUALS", "CPU", "MAINBOARD", "socket", "socket")));
        assertFalse(result.compatible());
        assertEquals("CPU_MB_SOCKET", result.issues().get(0).ruleCode());
    }

    @Test
    void matchingBuildIsCompatible() {
        var result = CompatibilityService.evaluate(List.of(CPU_INTEL, MB_LGA, RAM_KIT),
                List.of(rule("CPU_MB_SOCKET", "EQUALS", "CPU", "MAINBOARD", "socket", "socket"),
                        rule("RAM_MB_SLOTS", "SUM_LTE", "RAM", "MAINBOARD", "modules", "ram_slots"),
                        maxCount("ONE_CPU", "CPU", 1)));
        assertTrue(result.compatible());
        assertTrue(result.issues().isEmpty());
        // không có luật công suất: số cần = tổng TDP
        assertEquals(result.estimatedWattage(), result.requiredWattage());
    }

    @Test
    void ramModulesExceedingSlotsIsError() {
        // 2 kit x 2 thanh = 4 thanh, mainboard chỉ có 2 khe
        var result = CompatibilityService.evaluate(List.of(MB_AM5, RAM_KIT, RAM_KIT),
                List.of(rule("RAM_MB_SLOTS", "SUM_LTE", "RAM", "MAINBOARD", "modules", "ram_slots")));
        assertFalse(result.compatible());
        assertEquals("RAM / B650: 4 vs 2", result.issues().get(0).message());
    }

    @Test
    void twoCpusExceedMaxCount() {
        var result = CompatibilityService.evaluate(List.of(CPU_INTEL, CPU_INTEL, MB_LGA),
                List.of(maxCount("ONE_CPU", "CPU", 1)));
        assertFalse(result.compatible());
        assertEquals("ONE_CPU", result.issues().get(0).ruleCode());
    }

    @Test
    void wattageUsesMarginAndCountsEveryPart() {
        CompatibilityRule psu = rule("PSU_WATTAGE", "SUM_TDP_LTE_WATTAGE", "*", "PSU", "tdp_w", "wattage");
        psu.margin = 1.2;
        // (125 + 320) x 1.2 = 534 > 500
        var result = CompatibilityService.evaluate(List.of(CPU_INTEL, GPU, PSU_500), List.of(psu));
        assertFalse(result.compatible());
        assertEquals(445, result.estimatedWattage());
        assertEquals(534, result.requiredWattage());
    }

    @Test
    void missingSpecSkipsRule() {
        Product unknownCase = part("CASE", "case", Map.of());
        var result = CompatibilityService.evaluate(List.of(GPU, unknownCase),
                List.of(rule("GPU_CASE_LENGTH", "LTE", "GPU", "CASE", "length_mm", "max_gpu_length_mm")));
        assertTrue(result.compatible());
    }

    @Test
    void warningDoesNotBreakCompatibility() {
        CompatibilityRule coolers = maxCount("ONE_COOLER", "COOLER", 1);
        coolers.severity = CompatibilityRule.WARNING;
        Product cooler = part("COOLER", "cooler", Map.of());
        var result = CompatibilityService.evaluate(List.of(cooler, cooler), List.of(coolers));
        assertTrue(result.compatible());
        assertEquals(1, result.issues().size());
    }
}
