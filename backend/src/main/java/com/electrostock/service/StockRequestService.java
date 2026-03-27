package com.electrostock.service;

import com.electrostock.model.*;
import com.electrostock.repository.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;

@Service
public class StockRequestService {

    @Autowired private StockRequestRepository requestRepository;
    @Autowired private ProductRepository productRepository;
    @Autowired private UserRepository userRepository;
    @Autowired private AuditLogRepository auditLogRepository;

    private Map<String, Object> toMap(StockRequest r) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", r.getId());
        m.put("type", r.getType());
        m.put("quantity", r.getQuantity());
        m.put("reason", r.getReason());
        m.put("status", r.getStatus());
        m.put("adminNote", r.getAdminNote());
        m.put("createdAt", r.getCreatedAt());
        m.put("resolvedAt", r.getResolvedAt());

        if (r.getProduct() != null) {
            Map<String, Object> prod = new LinkedHashMap<>();
            prod.put("id", r.getProduct().getId());
            prod.put("name", r.getProduct().getName());
            prod.put("sku", r.getProduct().getSku());
            prod.put("category", r.getProduct().getCategory());
            prod.put("quantity", r.getProduct().getQuantity());
            m.put("product", prod);
        }
        if (r.getStaff() != null) {
            Map<String, Object> staff = new LinkedHashMap<>();
            staff.put("id", r.getStaff().getId());
            staff.put("username", r.getStaff().getUsername());
            staff.put("email", r.getStaff().getEmail());
            m.put("staff", staff);
        }
        if (r.getAdmin() != null) {
            Map<String, Object> admin = new LinkedHashMap<>();
            admin.put("id", r.getAdmin().getId());
            admin.put("username", r.getAdmin().getUsername());
            m.put("admin", admin);
        }
        return m;
    }

    @Transactional
    public Map<String, Object> create(String staffUsername, Map<String, Object> body) {
        User staff = userRepository.findByUsername(staffUsername)
                .orElseThrow(() -> new RuntimeException("User not found"));
        Long productId = ((Number) body.get("productId")).longValue();
        Long adminId = ((Number) body.get("adminId")).longValue();
        String type = (String) body.get("type");
        int quantity = ((Number) body.get("quantity")).intValue();

        Product product = productRepository.findById(productId)
                .orElseThrow(() -> new RuntimeException("Product not found"));
        User admin = userRepository.findById(adminId)
                .orElseThrow(() -> new RuntimeException("Admin not found"));

        StockRequest req = new StockRequest();
        req.setProduct(product);
        req.setStaff(staff);
        req.setAdmin(admin);
        req.setType(type);
        req.setQuantity(quantity);
        req.setReason((String) body.getOrDefault("reason", ""));
        requestRepository.save(req);

        AuditLog log = new AuditLog();
        log.setAction("STOCK_REQUEST_CREATED");
        log.setPerformedBy(staff);
        log.setTargetModel("StockRequest");
        log.setTargetId(req.getId());
        log.setDetails("{\"type\":\"" + type + "\",\"quantity\":" + quantity + "}");
        auditLogRepository.save(log);

        return toMap(req);
    }

    public List<Map<String, Object>> getMyRequests(String staffUsername) {
        User staff = userRepository.findByUsername(staffUsername)
                .orElseThrow(() -> new RuntimeException("User not found"));
        return requestRepository.findByStaffOrderByCreatedAtDesc(staff)
                .stream().map(this::toMap).toList();
    }

    public List<Map<String, Object>> getAdminRequests(String adminUsername) {
        User admin = userRepository.findByUsername(adminUsername)
                .orElseThrow(() -> new RuntimeException("User not found"));
        return requestRepository.findByAdminOrderByCreatedAtDesc(admin)
                .stream().map(this::toMap).toList();
    }

    @Transactional
    public Map<String, Object> resolve(String adminUsername, Long id, String status, String adminNote) {
        User admin = userRepository.findByUsername(adminUsername)
                .orElseThrow(() -> new RuntimeException("User not found"));
        StockRequest req = requestRepository.findByIdAndAdmin(id, admin)
                .orElseThrow(() -> new RuntimeException("Request not found"));
        if (!"pending".equals(req.getStatus()))
            throw new RuntimeException("Request already resolved");

        req.setStatus(status);
        req.setAdminNote(adminNote != null ? adminNote : "");
        req.setResolvedAt(LocalDateTime.now());

        if ("approved".equals(status)) {
            Product product = req.getProduct();
            if ("stock-in".equals(req.getType())) {
                product.setQuantity(product.getQuantity() + req.getQuantity());
            } else {
                if (product.getQuantity() < req.getQuantity())
                    throw new RuntimeException("Insufficient stock for stock-out");
                product.setQuantity(product.getQuantity() - req.getQuantity());
            }
            product.setUpdatedAt(LocalDateTime.now());
            productRepository.save(product);
        }

        requestRepository.save(req);

        AuditLog log = new AuditLog();
        log.setAction("approved".equals(status) ? "STOCK_REQUEST_APPROVED" : "STOCK_REQUEST_REJECTED");
        log.setPerformedBy(admin);
        log.setTargetModel("StockRequest");
        log.setTargetId(req.getId());
        log.setDetails("{\"type\":\"" + req.getType() + "\",\"quantity\":" + req.getQuantity() + "}");
        auditLogRepository.save(log);

        return toMap(req);
    }
}
