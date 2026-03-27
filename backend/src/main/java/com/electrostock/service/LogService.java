package com.electrostock.service;

import com.electrostock.model.*;
import com.electrostock.repository.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.*;

@Service
public class LogService {

    @Autowired private AuditLogRepository auditLogRepository;
    @Autowired private UserRepository userRepository;

    private Map<String, Object> toMap(AuditLog l) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", l.getId());
        m.put("action", l.getAction());
        m.put("targetModel", l.getTargetModel());
        m.put("targetId", l.getTargetId());
        m.put("details", l.getDetails());
        m.put("createdAt", l.getCreatedAt());
        if (l.getPerformedBy() != null) {
            Map<String, Object> u = new LinkedHashMap<>();
            u.put("id", l.getPerformedBy().getId());
            u.put("username", l.getPerformedBy().getUsername());
            u.put("role", l.getPerformedBy().getRole().name());
            m.put("performedBy", u);
        }
        return m;
    }

    public List<Map<String, Object>> getAuditLogs(String username) {
        User user = userRepository.findByUsername(username).orElseThrow();
        return auditLogRepository.findByPerformedByOrderByCreatedAtDesc(user)
                .stream().map(this::toMap).toList();
    }

    public List<Map<String, Object>> getTransactionLogs(String username) {
        User user = userRepository.findByUsername(username).orElseThrow();
        List<String> actions = List.of(
                "STOCK_REQUEST_APPROVED", "STOCK_REQUEST_REJECTED",
                "PRODUCT_CREATED", "PRODUCT_UPDATED", "PRODUCT_DELETED"
        );
        return auditLogRepository.findByPerformedByAndActionInOrderByCreatedAtDesc(user, actions)
                .stream().map(this::toMap).toList();
    }
}
