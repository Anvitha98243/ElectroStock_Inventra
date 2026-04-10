package com.electrostock.service;

import com.electrostock.model.*;
import com.electrostock.repository.*;
import com.electrostock.security.JwtUtil;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.security.authentication.*;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import jakarta.mail.internet.MimeMessage;
import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class AuthService {

    @Autowired
    private UserRepository userRepository;
    @Autowired
    private PasswordResetTokenRepository resetTokenRepository;
    @Autowired
    private AuditLogRepository auditLogRepository;
    @Autowired
    private PasswordEncoder passwordEncoder;
    @Autowired
    private JwtUtil jwtUtil;
    @Autowired
    private AuthenticationManager authenticationManager;
    @Autowired
    private EmailService emailService;
    @Autowired
    private JavaMailSender mailSender;

    @Value("${spring.mail.username}")
    private String fromEmail;

    // ── In-memory store for pending registrations ─────────────────────────────
    private final ConcurrentHashMap<String, Map<String, Object>> pendingRegistrations = new ConcurrentHashMap<>();

    // ── Synchronous OTP send ──────────────────────────────────────────────────
    // Sends email synchronously so we can catch delivery failures immediately.
    // Returns true if sent successfully, false if address is invalid/rejected.
    private boolean sendOTPSync(String toEmail, String username, String otp) {
        try {
            StringBuilder boxes = new StringBuilder();
            for (char c : otp.toCharArray()) {
                boxes.append("<td style='width:44px;height:52px;text-align:center;"
                        + "vertical-align:middle;background:#f0fdf4;"
                        + "border:2px solid #16a34a;border-radius:8px;"
                        + "font-size:26px;font-weight:800;color:#15803d;'>")
                        .append(c)
                        .append("</td><td style='width:6px;'></td>");
            }

            String html = "<!DOCTYPE html><html><head><meta charset='utf-8'/></head>"
                    + "<body style='margin:0;padding:0;background:#f0f4f8;font-family:Arial,sans-serif;'>"
                    + "<table width='100%' cellpadding='0' cellspacing='0' style='background:#f0f4f8;padding:40px 0;'>"
                    + "<tr><td align='center'>"
                    + "<table width='480' cellpadding='0' cellspacing='0' "
                    + "style='background:#ffffff;border-radius:16px;overflow:hidden;"
                    + "box-shadow:0 4px 24px rgba(0,0,0,0.08);'>"
                    + "<tr><td style='background:#0f172a;padding:28px 40px;text-align:center;'>"
                    + "<div style='font-size:30px;margin-bottom:6px;'>&#9889;</div>"
                    + "<div style='color:#ffffff;font-size:20px;font-weight:700;'>ElectroStock</div>"
                    + "<div style='color:#64748b;font-size:12px;margin-top:3px;'>Smart Inventory Management</div>"
                    + "</td></tr>"
                    + "<tr><td style='padding:36px 40px 32px;'>"
                    + "<h2 style='margin:0 0 10px;font-size:22px;color:#111827;font-weight:700;'>Verify Your Email &#9989;</h2>"
                    + "<p style='margin:0 0 24px;font-size:15px;color:#4b5563;line-height:1.7;'>"
                    + "Hi <strong>" + username + "</strong>, use this 6-digit OTP to verify "
                    + "your email and complete registration. "
                    + "Expires in <strong>10 minutes</strong>.</p>"
                    + "<table width='100%' style='margin-bottom:24px;'>"
                    + "<tr><td align='center'>"
                    + "<table cellpadding='0' cellspacing='0'><tr>"
                    + boxes
                    + "</tr></table></td></tr></table>"
                    + "<div style='background:#f0fdf4;border:1px solid #86efac;"
                    + "border-radius:8px;padding:12px 16px;margin-bottom:20px;'>"
                    + "<p style='margin:0;font-size:13px;color:#15803d;'>"
                    + "&#128994; This OTP confirms your email address is valid.</p></div>"
                    + "<p style='margin:0;font-size:13px;color:#9ca3af;'>"
                    + "If you did not try to register, ignore this email.</p>"
                    + "</td></tr>"
                    + "<tr><td style='background:#f8fafc;border-top:1px solid #e5e7eb;"
                    + "padding:18px 40px;text-align:center;'>"
                    + "<p style='margin:0;font-size:12px;color:#9ca3af;'>"
                    + "&copy; 2024 ElectroStock. Sent to " + toEmail + ".</p>"
                    + "</td></tr>"
                    + "</table></td></tr></table>"
                    + "</body></html>";

            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
            helper.setFrom(fromEmail);
            helper.setTo(toEmail);
            helper.setSubject("Verify your ElectroStock account");
            helper.setText(html, true);

            mailSender.send(message);
            return true;

        } catch (org.springframework.mail.MailSendException e) {
            // mail server rejected the address — invalid inbox
            return false;
        } catch (Exception e) {
            // SMTP connection issues etc — fail safe, show error
            return false;
        }
    }

    // ── Step 1: Send OTP to verify email exists ───────────────────────────────
    public Map<String, Object> sendRegistrationOTP(String username, String email,
            String password, String role) {
        if (userRepository.existsByUsername(username))
            throw new RuntimeException("Username already exists");
        if (userRepository.existsByEmail(email.toLowerCase().trim()))
            throw new RuntimeException("Email already exists");

        String otp = String.format("%06d", new SecureRandom().nextInt(1000000));
        String sessionToken = UUID.randomUUID().toString().replace("-", "");

        // send synchronously — catches failures immediately
        boolean sent = sendOTPSync(email.trim(), username, otp);
        if (!sent) {
            throw new RuntimeException(
                    "This email address doesn't exist or cannot receive emails. "
                            + "Please check and try again.");
        }

        // store pending registration
        Map<String, Object> pending = new HashMap<>();
        pending.put("username", username);
        pending.put("email", email.toLowerCase().trim());
        pending.put("password", password);
        pending.put("role", role);
        pending.put("otp", otp);
        pending.put("expiresAt", LocalDateTime.now().plusMinutes(10));
        pending.put("attempts", 0);
        pendingRegistrations.put(sessionToken, pending);

        cleanupExpired();

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("message", "OTP sent! Check your email to verify and complete registration.");
        result.put("sessionToken", sessionToken);
        return result;
    }

    // ── Step 2: Verify OTP and create account ─────────────────────────────────
    @Transactional
    public Map<String, Object> verifyAndRegister(String sessionToken, String otp) {
        Map<String, Object> pending = pendingRegistrations.get(sessionToken);

        if (pending == null)
            throw new RuntimeException("Session expired. Please register again.");

        LocalDateTime expiresAt = (LocalDateTime) pending.get("expiresAt");
        if (LocalDateTime.now().isAfter(expiresAt)) {
            pendingRegistrations.remove(sessionToken);
            throw new RuntimeException("OTP expired. Please register again.");
        }

        int attempts = (int) pending.get("attempts");
        if (attempts >= 5) {
            pendingRegistrations.remove(sessionToken);
            throw new RuntimeException("Too many wrong attempts. Please register again.");
        }

        String storedOtp = (String) pending.get("otp");
        if (!storedOtp.equals(otp.trim())) {
            pending.put("attempts", attempts + 1);
            int remaining = 4 - attempts;
            throw new RuntimeException(
                    "Invalid OTP. " + (remaining > 0 ? remaining + " attempt(s) remaining." : ""));
        }

        // OTP correct — create account
        String username = (String) pending.get("username");
        String email = (String) pending.get("email");
        String password = (String) pending.get("password");
        String role = (String) pending.get("role");

        if (userRepository.existsByUsername(username))
            throw new RuntimeException("Username already exists");
        if (userRepository.existsByEmail(email))
            throw new RuntimeException("Email already exists");

        User user = new User();
        user.setUsername(username);
        user.setEmail(email);
        user.setPassword(passwordEncoder.encode(password));
        user.setRole(User.Role.valueOf(role));
        userRepository.save(user);

        pendingRegistrations.remove(sessionToken);

        // send welcome email async
        emailService.sendWelcomeEmail(email, username, role);

        return Map.of("message", "Account created successfully! You can now log in.");
    }

    // ── Resend OTP ─────────────────────────────────────────────────────────────
    public Map<String, Object> resendRegistrationOTP(String sessionToken) {
        Map<String, Object> pending = pendingRegistrations.get(sessionToken);
        if (pending == null)
            throw new RuntimeException("Session expired. Please register again.");

        String newOtp = String.format("%06d", new SecureRandom().nextInt(1000000));
        String username = (String) pending.get("username");
        String email = (String) pending.get("email");

        boolean sent = sendOTPSync(email, username, newOtp);
        if (!sent)
            throw new RuntimeException("Failed to resend OTP. Please try again.");

        pending.put("otp", newOtp);
        pending.put("expiresAt", LocalDateTime.now().plusMinutes(10));
        pending.put("attempts", 0);

        return Map.of("message", "New OTP sent successfully.");
    }

    // ── Clean up expired pending registrations ────────────────────────────────
    private void cleanupExpired() {
        pendingRegistrations.entrySet().removeIf(entry -> {
            LocalDateTime exp = (LocalDateTime) entry.getValue().get("expiresAt");
            return LocalDateTime.now().isAfter(exp);
        });
    }

    // ── All existing methods — completely unchanged ───────────────────────────

    public Map<String, Object> login(String username, String password) {
        authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(username, password));
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
    public Map<String, Object> changePassword(String username,
            String currentPassword, String newPassword) {
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
    public Map<String, Object> resetPassword(String sessionToken, String otp,
            String newPassword) {
        PasswordResetToken prt = resetTokenRepository
                .findByTokenAndUsedFalseAndExpiresAtAfter(sessionToken, LocalDateTime.now())
                .orElseThrow(() -> new RuntimeException(
                        "Session expired. Please request a new OTP."));

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