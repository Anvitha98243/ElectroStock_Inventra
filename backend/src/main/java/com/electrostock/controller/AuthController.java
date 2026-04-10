package com.electrostock.controller;

import com.electrostock.service.AuthService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    @Autowired
    private AuthService authService;

    // ── Step 1: send OTP to verify email exists ───────────────────────────────
    @PostMapping("/register/send-otp")
    public ResponseEntity<?> registerSendOtp(@RequestBody Map<String, String> body) {
        try {
            String username = body.get("username");
            String email = body.get("email");
            String password = body.get("password");
            String role = body.get("role");
            if (username == null || email == null || password == null || role == null)
                return ResponseEntity.badRequest()
                        .body(Map.of("message", "All fields are required"));
            if (password.length() < 6)
                return ResponseEntity.badRequest()
                        .body(Map.of("message", "Password must be at least 6 characters"));
            return ResponseEntity.ok(
                    authService.sendRegistrationOTP(username, email, password, role));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    // ── Step 2: verify OTP and create account ─────────────────────────────────
    @PostMapping("/register/verify-otp")
    public ResponseEntity<?> registerVerifyOtp(@RequestBody Map<String, String> body) {
        try {
            String sessionToken = body.get("sessionToken");
            String otp = body.get("otp");
            if (sessionToken == null || otp == null)
                return ResponseEntity.badRequest()
                        .body(Map.of("message", "sessionToken and otp are required"));
            return ResponseEntity.status(201)
                    .body(authService.verifyAndRegister(sessionToken, otp));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    // ── Resend OTP ─────────────────────────────────────────────────────────────
    @PostMapping("/register/resend-otp")
    public ResponseEntity<?> registerResendOtp(@RequestBody Map<String, String> body) {
        try {
            String sessionToken = body.get("sessionToken");
            if (sessionToken == null)
                return ResponseEntity.badRequest()
                        .body(Map.of("message", "sessionToken is required"));
            return ResponseEntity.ok(authService.resendRegistrationOTP(sessionToken));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    // ── Keep old /register endpoint as fallback (unused but safe) ─────────────
    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody Map<String, String> body) {
        try {
            String username = body.get("username");
            String email = body.get("email");
            String password = body.get("password");
            String role = body.get("role");
            if (username == null || email == null || password == null || role == null)
                return ResponseEntity.badRequest()
                        .body(Map.of("message", "All fields are required"));
            if (password.length() < 6)
                return ResponseEntity.badRequest()
                        .body(Map.of("message", "Password must be at least 6 characters"));
            return ResponseEntity.status(201)
                    .body(authService.sendRegistrationOTP(username, email, password, role));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody Map<String, String> body) {
        try {
            return ResponseEntity.ok(
                    authService.login(body.get("username"), body.get("password")));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", "Invalid credentials"));
        }
    }

    @GetMapping("/me")
    public ResponseEntity<?> me(@AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(authService.getUserInfo(userDetails.getUsername()));
    }

    @GetMapping("/search-admin")
    public ResponseEntity<?> searchAdmin(@RequestParam String username) {
        try {
            return ResponseEntity.ok(authService.searchAdmin(username));
        } catch (Exception e) {
            return ResponseEntity.status(404).body(Map.of("message", e.getMessage()));
        }
    }

    @PutMapping("/change-password")
    public ResponseEntity<?> changePassword(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestBody Map<String, String> body) {
        try {
            String current = body.get("currentPassword");
            String newPass = body.get("newPassword");
            if (current == null || newPass == null)
                return ResponseEntity.badRequest()
                        .body(Map.of("message", "All fields required"));
            if (newPass.length() < 6)
                return ResponseEntity.badRequest()
                        .body(Map.of("message", "Password must be at least 6 characters"));
            return ResponseEntity.ok(
                    authService.changePassword(userDetails.getUsername(), current, newPass));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    @PostMapping("/forgot-password")
    public ResponseEntity<?> forgotPassword(@RequestBody Map<String, String> body) {
        try {
            String email = body.get("email");
            if (email == null || email.isBlank())
                return ResponseEntity.badRequest()
                        .body(Map.of("message", "Email is required"));
            return ResponseEntity.ok(authService.forgotPassword(email));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("message", e.getMessage()));
        }
    }

    @PostMapping("/reset-password")
    public ResponseEntity<?> resetPassword(@RequestBody Map<String, String> body) {
        try {
            String sessionToken = body.get("sessionToken");
            String otp = body.get("otp");
            String newPassword = body.get("newPassword");
            if (sessionToken == null || otp == null || newPassword == null)
                return ResponseEntity.badRequest()
                        .body(Map.of("message", "All fields required"));
            if (newPassword.length() < 6)
                return ResponseEntity.badRequest()
                        .body(Map.of("message", "Password must be at least 6 characters"));
            return ResponseEntity.ok(
                    authService.resetPassword(sessionToken, otp, newPassword));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }
}