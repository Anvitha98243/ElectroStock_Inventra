package com.electrostock.service;

import com.electrostock.model.*;
import com.electrostock.repository.*;
import com.electrostock.security.JwtUtil;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.authentication.*;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.*;

@Service
public class AuthService {

    @Autowired private UserRepository userRepository;
    @Autowired private PasswordResetTokenRepository resetTokenRepository;
    @Autowired private AuditLogRepository auditLogRepository;
    @Autowired private PasswordEncoder passwordEncoder;
    @Autowired private JwtUtil jwtUtil;
    @Autowired private AuthenticationManager authenticationManager;
    @Autowired private EmailService emailService;

    public Map<String, Object> register(String username, String email, String password, String role) {
        if (userRepository.existsByUsername(username))
            throw new RuntimeException("Username already exists");
        if (userRepository.existsByEmail(email))
            throw new RuntimeException("Email already exists");

        User user = new User();
        user.setUsername(username);
        user.setEmail(email.toLowerCase().trim());
        user.setPassword(passwordEncoder.encode(password));
        user.setRole(User.Role.valueOf(role));
        userRepository.save(user);

        emailService.sendWelcomeEmail(email, username, role);

        return Map.of("message", "User registered successfully");
    }

    public Map<String, Object> login(String username, String password) {
        authenticationManager.authenticate(new UsernamePasswordAuthenticationToken(username, password));
        User user = userRepository.findByUsername(username).orElseThrow();
        String token = jwtUtil.generateToken(username);

        AuditLog log = new AuditLog();
        log.setAction("USER_LOGIN");
        log.setPerformedBy(user);
        log.setDetails("{\"username\":\"" + username + "\",\"role\":\"" + user.getRole() + "\"}");
        auditLogRepository.save(log);

        Map<String, Object> userMap = new LinkedHashMap<>();
        userMap.put("id", user.getId());
        userMap.put("username", user.getUsername());
        userMap.put("email", user.getEmail());
        userMap.put("role", user.getRole().name());

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("token", token);
        result.put("user", userMap);
        return result;
    }

    public Map<String, Object> getUserInfo(String username) {
        User user = userRepository.findByUsername(username).orElseThrow();
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("id", user.getId());
        map.put("username", user.getUsername());
        map.put("email", user.getEmail());
        map.put("role", user.getRole().name());
        return map;
    }

    public Map<String, Object> searchAdmin(String username) {
        User admin = userRepository.findByUsernameAndRole(username, User.Role.admin)
                .orElseThrow(() -> new RuntimeException("Admin not found"));
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("id", admin.getId());
        map.put("username", admin.getUsername());
        map.put("email", admin.getEmail());
        map.put("role", admin.getRole().name());
        return map;
    }

    @Transactional
    public Map<String, Object> changePassword(String username, String currentPassword, String newPassword) {
        User user = userRepository.findByUsername(username).orElseThrow();
        if (!passwordEncoder.matches(currentPassword, user.getPassword()))
            throw new RuntimeException("Current password is incorrect");
        user.setPassword(passwordEncoder.encode(newPassword));
        userRepository.save(user);

        AuditLog log = new AuditLog();
        log.setAction("PASSWORD_CHANGED");
        log.setPerformedBy(user);
        log.setDetails("{\"username\":\"" + username + "\"}");
        auditLogRepository.save(log);

        return Map.of("message", "Password changed successfully");
    }

    @Transactional
    public Map<String, Object> forgotPassword(String email) {
        Optional<User> opt = userRepository.findByEmail(email.toLowerCase().trim());
        if (opt.isEmpty())
            return Map.of("message", "If that email is registered, an OTP has been sent.");

        User user = opt.get();
        resetTokenRepository.deleteByUser(user);

        String otp = String.format("%06d", new SecureRandom().nextInt(1000000));
        String sessionToken = UUID.randomUUID().toString().replace("-", "");

        PasswordResetToken prt = new PasswordResetToken();
        prt.setUser(user);
        prt.setToken(sessionToken);
        prt.setOtp(otp);
        prt.setExpiresAt(LocalDateTime.now().plusMinutes(15));
        resetTokenRepository.save(prt);

        emailService.sendOTPEmail(user.getEmail(), user.getUsername(), otp);

        AuditLog log = new AuditLog();
        log.setAction("PASSWORD_RESET_REQUESTED");
        log.setPerformedBy(user);
        log.setDetails("{\"email\":\"" + email + "\"}");
        auditLogRepository.save(log);

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("message", "OTP sent to your email. Valid for 15 minutes.");
        result.put("sessionToken", sessionToken);
        return result;
    }

    @Transactional
    public Map<String, Object> resetPassword(String sessionToken, String otp, String newPassword) {
        PasswordResetToken prt = resetTokenRepository
                .findByTokenAndUsedFalseAndExpiresAtAfter(sessionToken, LocalDateTime.now())
                .orElseThrow(() -> new RuntimeException("Session expired. Please request a new OTP."));

        if (!prt.getOtp().equals(otp.trim()))
            throw new RuntimeException("Invalid OTP. Please check your email and try again.");

        User user = prt.getUser();
        user.setPassword(passwordEncoder.encode(newPassword));
        userRepository.save(user);

        prt.setUsed(true);
        resetTokenRepository.save(prt);

        AuditLog log = new AuditLog();
        log.setAction("PASSWORD_RESET_COMPLETED");
        log.setPerformedBy(user);
        log.setDetails("{\"username\":\"" + user.getUsername() + "\"}");
        auditLogRepository.save(log);

        return Map.of("message", "Password reset successfully. You can now log in.");
    }
}
