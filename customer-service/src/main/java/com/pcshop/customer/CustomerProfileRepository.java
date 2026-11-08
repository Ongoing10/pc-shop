package com.pcshop.customer;

import io.quarkus.hibernate.orm.panache.PanacheRepositoryBase;
import jakarta.enterprise.context.ApplicationScoped;
import org.eclipse.microprofile.config.inject.ConfigProperty;

import java.util.Collection;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

@ApplicationScoped
public class CustomerProfileRepository implements PanacheRepositoryBase<CustomerProfile, UUID> {

    @ConfigProperty(name = "quarkus.hibernate-orm.database.default-schema")
    String schema;

    /** Số điện thoại theo id (user chưa có hồ sơ thì không có trong map). */
    public Map<UUID, String> phonesOf(Collection<UUID> ids) {
        if (ids.isEmpty()) {
            return Map.of();
        }
        Map<UUID, String> result = new HashMap<>();
        list("id in ?1", ids).forEach(p -> result.put(p.id, p.phoneNumber));
        return result;
    }

    /**
     * Tạo hồ sơ nếu chưa có rồi trả về hồ sơ. Dùng INSERT ... ON CONFLICT DO NOTHING vì frontend thường gọi
     * nhiều API cùng lúc ở lần đầu đăng nhập: persist() thường sẽ lỗi trùng khóa ở request thứ hai.
     */
    public CustomerProfile findOrCreate(UUID id, String email, String displayName) {
        getEntityManager().createNativeQuery("INSERT INTO " + schema + ".customer_profiles"
                        + " (id, email, display_name, created_by, created_at, updated_by, updated_at)"
                        + " VALUES (:id, :email, :name, :id, now(), :id, now()) ON CONFLICT (id) DO NOTHING")
                .setParameter("id", id)
                .setParameter("email", email)
                .setParameter("name", displayName)
                .executeUpdate();
        return findById(id);
    }
}
