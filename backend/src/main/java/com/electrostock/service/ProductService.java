package com.electrostock.service;

import com.electrostock.model.*;
import com.electrostock.repository.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;

@Service
public class ProductService {

    @Autowired
    private ProductRepository productRepository;
    @Autowired
    private UserRepository userRepository;
    @Autowired
    private AuditLogRepository auditLogRepository;
    @Autowired
    private StockRequestRepository stockRequestRepository;

    private User getAdmin(String username) {
        return userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("User not found"));
    }

    private Map<String, Object> toMap(Product p) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", p.getId());
        m.put("name", p.getName());
        m.put("sku", p.getSku());
        m.put("category", p.getCategory());
        m.put("description", p.getDescription());
        m.put("quantity", p.getQuantity());
        m.put("minThreshold", p.getMinThreshold());
        m.put("price", p.getPrice());
        m.put("supplier", p.getSupplier());
        m.put("location", p.getLocation());
        m.put("isLowStock", p.isLowStock());
        m.put("adminId", p.getAdmin().getId());
        m.put("adminUsername", p.getAdmin().getUsername());
        m.put("createdAt", p.getCreatedAt());
        m.put("updatedAt", p.getUpdatedAt());
        return m;
    }

    public List<Map<String, Object>> getAllByAdmin(String username) {
        User admin = getAdmin(username);
        return productRepository.findByAdminOrderByCreatedAtDesc(admin)
                .stream().map(this::toMap).toList();
    }

    public List<Map<String, Object>> getByAdminId(Long adminId) {
        User admin = userRepository.findById(adminId)
                .orElseThrow(() -> new RuntimeException("Admin not found"));
        return productRepository.findByAdminOrderByCreatedAtDesc(admin)
                .stream().map(this::toMap).toList();
    }

    public List<Map<String, Object>> getLowStock(String username) {
        User admin = getAdmin(username);
        return productRepository.findLowStockByAdmin(admin)
                .stream().map(this::toMap).toList();
    }

    public Map<String, Object> getById(Long id) {
        Product p = productRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Product not found"));
        return toMap(p);
    }

    @Transactional
    public Map<String, Object> create(String username, Map<String, Object> body) {
        User admin = getAdmin(username);
        String sku = (String) body.get("sku");
        if (productRepository.findBySkuAndAdmin(sku, admin).isPresent())
            throw new RuntimeException("SKU already exists for this admin");

        Product p = new Product();
        p.setName((String) body.get("name"));
        p.setSku(sku);
        p.setCategory((String) body.get("category"));
        p.setDescription((String) body.getOrDefault("description", ""));
        p.setQuantity(body.get("quantity") != null ? ((Number) body.get("quantity")).intValue() : 0);
        p.setMinThreshold(body.get("minThreshold") != null ? ((Number) body.get("minThreshold")).intValue() : 10);
        p.setPrice(((Number) body.get("price")).doubleValue());
        p.setSupplier((String) body.getOrDefault("supplier", ""));
        p.setLocation((String) body.getOrDefault("location", ""));
        p.setAdmin(admin);
        productRepository.save(p);

        AuditLog log = new AuditLog();
        log.setAction("PRODUCT_CREATED");
        log.setPerformedBy(admin);
        log.setTargetModel("Product");
        log.setTargetId(p.getId());
        log.setDetails("{\"name\":\"" + p.getName() + "\",\"sku\":\"" + p.getSku() + "\"}");
        auditLogRepository.save(log);

        return toMap(p);
    }

    @Transactional
    public Map<String, Object> update(String username, Long id, Map<String, Object> body) {
        User admin = getAdmin(username);
        Product p = productRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Product not found"));
        if (!p.getAdmin().getId().equals(admin.getId()))
            throw new RuntimeException("Access denied");

        if (body.containsKey("name"))
            p.setName((String) body.get("name"));
        if (body.containsKey("sku"))
            p.setSku((String) body.get("sku"));
        if (body.containsKey("category"))
            p.setCategory((String) body.get("category"));
        if (body.containsKey("description"))
            p.setDescription((String) body.get("description"));
        if (body.containsKey("quantity"))
            p.setQuantity(((Number) body.get("quantity")).intValue());
        if (body.containsKey("minThreshold"))
            p.setMinThreshold(((Number) body.get("minThreshold")).intValue());
        if (body.containsKey("price"))
            p.setPrice(((Number) body.get("price")).doubleValue());
        if (body.containsKey("supplier"))
            p.setSupplier((String) body.get("supplier"));
        if (body.containsKey("location"))
            p.setLocation((String) body.get("location"));
        p.setUpdatedAt(LocalDateTime.now());
        productRepository.save(p);

        AuditLog log = new AuditLog();
        log.setAction("PRODUCT_UPDATED");
        log.setPerformedBy(admin);
        log.setTargetModel("Product");
        log.setTargetId(p.getId());
        log.setDetails("{\"name\":\"" + p.getName() + "\"}");
        auditLogRepository.save(log);

        return toMap(p);
    }

    @Transactional
    public Map<String, Object> delete(String username, Long id) {
        User admin = getAdmin(username);
        Product p = productRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Product not found"));
        if (!p.getAdmin().getId().equals(admin.getId()))
            throw new RuntimeException("Access denied");

        // Log before deletion
        AuditLog log = new AuditLog();
        log.setAction("PRODUCT_DELETED");
        log.setPerformedBy(admin);
        log.setTargetModel("Product");
        log.setTargetId(p.getId());
        log.setDetails("{\"name\":\"" + p.getName() + "\",\"sku\":\"" + p.getSku() + "\"}");
        auditLogRepository.save(log);

        // Delete related stock requests first to satisfy FK constraint
        List<StockRequest> relatedRequests = stockRequestRepository.findByProduct(p);
        stockRequestRepository.deleteAll(relatedRequests);

        productRepository.delete(p);
        return Map.of("message", "Product deleted successfully");
    }
}