package com.pcshop.customer;

import io.quarkus.hibernate.orm.panache.PanacheRepository;
import io.quarkus.panache.common.Sort;
import jakarta.enterprise.context.ApplicationScoped;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@ApplicationScoped
public class UserAddressRepository implements PanacheRepository<UserAddress> {

    /** Địa chỉ mặc định lên đầu, sau đó mới nhất trước. */
    public List<UserAddress> listByUser(UUID userId) {
        return list("userId", Sort.descending("isDefault", "id"), userId);
    }

    public Optional<UserAddress> findOwned(long id, UUID userId) {
        return find("id = ?1 and userId = ?2", id, userId).firstResultOptional();
    }

    public long countByUser(UUID userId) {
        return count("userId", userId);
    }

    /** Bỏ cờ mặc định của mọi địa chỉ khác (chạy ngay, trước khi đặt địa chỉ mới làm mặc định). */
    public void clearDefault(UUID userId, Long exceptId) {
        update("isDefault = false where userId = ?1 and isDefault = true and id <> ?2",
                userId, exceptId == null ? -1L : exceptId);
    }
}
