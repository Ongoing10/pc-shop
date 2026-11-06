package com.pcshop.customer;

import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.quarkus.runtime.Startup;
import jakarta.annotation.PostConstruct;
import jakarta.enterprise.context.ApplicationScoped;

import java.io.IOException;
import java.io.InputStream;
import java.io.UncheckedIOException;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * Danh mục hành chính 2 cấp (tỉnh/thành → phường/xã), dữ liệu tĩnh đọc một lần từ
 * resources/locations/vn-locations.json lúc khởi động. Dữ liệu hiện là bản TẠM (xem "_note" trong file).
 */
@Startup
@ApplicationScoped
public class LocationCatalog {

    public record Ward(String code, String name) {
    }

    public record Province(String code, String name, List<Ward> wards) {
    }

    /** Tỉnh/thành không kèm danh sách phường/xã (cho API danh sách). */
    public record ProvinceItem(String code, String name) {
    }

    record LocationFile(List<Province> provinces) {
    }

    private Map<String, Province> provinces = Map.of();

    @PostConstruct
    void load() {
        ObjectMapper mapper = new ObjectMapper().configure(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, false);
        try (InputStream in = Thread.currentThread().getContextClassLoader()
                .getResourceAsStream("locations/vn-locations.json")) {
            if (in == null) {
                throw new IllegalStateException("Thiếu file locations/vn-locations.json");
            }
            Map<String, Province> byCode = new LinkedHashMap<>();
            for (Province p : mapper.readValue(in, LocationFile.class).provinces()) {
                byCode.put(p.code(), p);
            }
            provinces = byCode;
        } catch (IOException e) {
            throw new UncheckedIOException("Không đọc được danh mục hành chính", e);
        }
    }

    public List<ProvinceItem> provinces() {
        return provinces.values().stream().map(p -> new ProvinceItem(p.code(), p.name())).toList();
    }

    public Optional<Province> province(String code) {
        return Optional.ofNullable(provinces.get(code));
    }

    public Optional<Ward> ward(String provinceCode, String wardCode) {
        return province(provinceCode).flatMap(p -> p.wards().stream()
                .filter(w -> w.code().equals(wardCode)).findFirst());
    }
}
