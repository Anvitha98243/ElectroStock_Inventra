package com.electrostock.controller;

import com.electrostock.service.ProductService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/products")
public class ProductController {

    @Autowired private ProductService productService;

    @GetMapping
    public ResponseEntity<?> getAll(@AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(productService.getAllByAdmin(userDetails.getUsername()));
    }

    @GetMapping("/alerts")
    public ResponseEntity<?> getLowStock(@AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(productService.getLowStock(userDetails.getUsername()));
    }

    @GetMapping("/by-admin/{adminId}")
    public ResponseEntity<?> getByAdmin(@PathVariable Long adminId) {
        try {
            return ResponseEntity.ok(productService.getByAdminId(adminId));
        } catch (Exception e) {
            return ResponseEntity.status(404).body(Map.of("message", e.getMessage()));
        }
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getById(@PathVariable Long id) {
        try {
            return ResponseEntity.ok(productService.getById(id));
        } catch (Exception e) {
            return ResponseEntity.status(404).body(Map.of("message", e.getMessage()));
        }
    }

    @PostMapping
    public ResponseEntity<?> create(@AuthenticationPrincipal UserDetails userDetails,
                                    @RequestBody Map<String, Object> body) {
        try {
            if (body.get("name") == null || body.get("sku") == null ||
                body.get("category") == null || body.get("price") == null)
                return ResponseEntity.badRequest().body(Map.of("message", "Name, SKU, category and price are required"));
            return ResponseEntity.status(201).body(productService.create(userDetails.getUsername(), body));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> update(@AuthenticationPrincipal UserDetails userDetails,
                                    @PathVariable Long id,
                                    @RequestBody Map<String, Object> body) {
        try {
            return ResponseEntity.ok(productService.update(userDetails.getUsername(), id, body));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> delete(@AuthenticationPrincipal UserDetails userDetails,
                                    @PathVariable Long id) {
        try {
            return ResponseEntity.ok(productService.delete(userDetails.getUsername(), id));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }
}
