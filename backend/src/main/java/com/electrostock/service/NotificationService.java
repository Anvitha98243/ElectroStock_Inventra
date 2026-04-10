package com.electrostock.service;

import com.electrostock.model.Notification;
import com.electrostock.model.User;
import com.electrostock.repository.NotificationRepository;
import com.electrostock.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.*;

@Service
public class NotificationService {

    @Autowired
    private NotificationRepository notificationRepository;
    @Autowired
    private UserRepository userRepository;

    // ── Create a notification for a user ─────────────────────────────────────
    public void create(User user, String title, String message, String type) {
        Notification n = new Notification();
        n.setUser(user);
        n.setTitle(title);
        n.setMessage(message);
        n.setType(type);
        notificationRepository.save(n);
    }

    // ── Get all notifications for logged-in user ──────────────────────────────
    public Map<String, Object> getNotifications(String username) {
        User user = userRepository.findByUsername(username).orElseThrow();
        List<Notification> list = notificationRepository
                .findByUserOrderByCreatedAtDesc(user);

        List<Map<String, Object>> items = new ArrayList<>();
        for (Notification n : list) {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id", n.getId());
            m.put("title", n.getTitle());
            m.put("message", n.getMessage());
            m.put("type", n.getType());
            m.put("read", n.isRead());
            m.put("createdAt", n.getCreatedAt());
            items.add(m);
        }

        long unread = notificationRepository.countByUserAndReadFalse(user);

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("notifications", items);
        result.put("unreadCount", unread);
        return result;
    }

    // ── Mark all as read ──────────────────────────────────────────────────────
    public Map<String, Object> markAllRead(String username) {
        User user = userRepository.findByUsername(username).orElseThrow();
        notificationRepository.markAllReadByUser(user);
        return Map.of("message", "All notifications marked as read");
    }

    // ── Get unread count only (for polling) ───────────────────────────────────
    public Map<String, Object> getUnreadCount(String username) {
        User user = userRepository.findByUsername(username).orElseThrow();
        long count = notificationRepository.countByUserAndReadFalse(user);
        return Map.of("unreadCount", count);
    }
}