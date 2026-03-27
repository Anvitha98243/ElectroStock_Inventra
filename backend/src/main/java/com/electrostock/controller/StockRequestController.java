package com.electrostock.controller;

import com.electrostock.service.StockRequestService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/requests")
public class StockRequestController {

    @Autowired private StockRequestService requestService;

    @PostMapping
    public ResponseEntity<?> create(@AuthenticationPrincipal UserDetails userDetails,
                                    @RequestBody Map<String, Object> body) {
        try {
            if (body.get("productId") == null || body.get("adminId") == null ||
                body.get("type") == null || body.get("quantity") == null)
                return ResponseEntity.badRequest().body(Map.of("message", "productId, adminId, type and quantity are required"));
            return ResponseEntity.status(201).body(requestService.create(userDetails.getUsername(), body));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    @GetMapping("/my")
    public ResponseEntity<?> myRequests(@AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(requestService.getMyRequests(userDetails.getUsername()));
    }

    @GetMapping("/admin")
    public ResponseEntity<?> adminRequests(@AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(requestService.getAdminRequests(userDetails.getUsername()));
    }

    @PutMapping("/{id}/resolve")
    public ResponseEntity<?> resolve(@AuthenticationPrincipal UserDetails userDetails,
                                     @PathVariable Long id,
                                     @RequestBody Map<String, String> body) {
        try {
            String status = body.get("status");
            if (!"approved".equals(status) && !"rejected".equals(status))
                return ResponseEntity.badRequest().body(Map.of("message", "Status must be approved or rejected"));
            return ResponseEntity.ok(requestService.resolve(userDetails.getUsername(), id, status, body.get("adminNote")));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }
}
