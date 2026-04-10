package com.electrostock.controller;

import com.electrostock.service.NotificationService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/notifications")
public class NotificationController {

    @Autowired
    private NotificationService notificationService;

    @GetMapping
    public ResponseEntity<?> getAll(@AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(
                notificationService.getNotifications(userDetails.getUsername()));
    }

    @GetMapping("/unread-count")
    public ResponseEntity<?> unreadCount(@AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(
                notificationService.getUnreadCount(userDetails.getUsername()));
    }

    @PutMapping("/mark-all-read")
    public ResponseEntity<?> markAllRead(@AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(
                notificationService.markAllRead(userDetails.getUsername()));
    }
}