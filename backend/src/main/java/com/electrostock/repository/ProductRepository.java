package com.electrostock.repository;

import com.electrostock.model.Product;
import com.electrostock.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface ProductRepository extends JpaRepository<Product, Long> {
    List<Product> findByAdminOrderByCreatedAtDesc(User admin);
    List<Product> findByAdmin(User admin);
    Optional<Product> findBySkuAndAdmin(String sku, User admin);

    default List<Product> findLowStockByAdmin(User admin) {
        return findByAdmin(admin).stream()
            .filter(p -> p.getQuantity() < p.getMinThreshold())
            .toList();
    }
}
