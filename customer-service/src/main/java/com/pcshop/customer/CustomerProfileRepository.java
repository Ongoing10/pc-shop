package com.pcshop.customer;

import io.quarkus.hibernate.orm.panache.PanacheRepositoryBase;
import jakarta.enterprise.context.ApplicationScoped;

import java.util.UUID;

@ApplicationScoped
public class CustomerProfileRepository implements PanacheRepositoryBase<CustomerProfile, UUID> {
}
