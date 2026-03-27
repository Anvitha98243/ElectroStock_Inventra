package com.electrostock.repository;

import com.electrostock.model.AuditLog;
import com.electrostock.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface AuditLogRepository extends JpaRepository<AuditLog, Long> {
    List<AuditLog> findByPerformedByOrderByCreatedAtDesc(User user);
    List<AuditLog> findByPerformedByAndActionInOrderByCreatedAtDesc(User user, List<String> actions);
}
