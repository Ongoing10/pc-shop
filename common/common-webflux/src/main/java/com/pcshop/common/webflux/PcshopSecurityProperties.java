package com.pcshop.common.webflux;

import org.springframework.boot.context.properties.ConfigurationProperties;

import java.util.ArrayList;
import java.util.List;

/** Cấu hình prefix {@code pcshop.security}. */
@ConfigurationProperties(prefix = "pcshop.security")
public class PcshopSecurityProperties {

    /** Client trong Keycloak chứa các client role dùng làm permission. */
    private String permissionClientId = "pcshop-backend";

    /** Đường dẫn không cần đăng nhập (mọi method), cú pháp PathPattern. */
    private List<String> publicPaths = new ArrayList<>();

    /** Đường dẫn chỉ mở cho GET không cần đăng nhập (vd xem sản phẩm, review). */
    private List<String> publicGetPaths = new ArrayList<>();

    public String getPermissionClientId() {
        return permissionClientId;
    }

    public void setPermissionClientId(String permissionClientId) {
        this.permissionClientId = permissionClientId;
    }

    public List<String> getPublicPaths() {
        return publicPaths;
    }

    public void setPublicPaths(List<String> publicPaths) {
        this.publicPaths = publicPaths;
    }

    public List<String> getPublicGetPaths() {
        return publicGetPaths;
    }

    public void setPublicGetPaths(List<String> publicGetPaths) {
        this.publicGetPaths = publicGetPaths;
    }
}
