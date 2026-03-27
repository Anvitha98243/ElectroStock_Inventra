package com.electrostock.repository;

import com.electrostock.model.Product;
import com.electrostock.model.StockRequest;
import com.electrostock.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface StockRequestRepository extends JpaRepository<StockRequest, Long> {
    List<StockRequest> findByStaffOrderByCreatedAtDesc(User staff);

    List<StockRequest> findByAdminOrderByCreatedAtDesc(User admin);

    Optional<StockRequest> findByIdAndAdmin(Long id, User admin);

    List<StockRequest> findByAdminAndStatusAndResolvedAtAfter(User admin, String status, LocalDateTime after);

    // FIX: needed to delete related requests before deleting a product

    List<StockRequest> findByProduct(Product product);
}