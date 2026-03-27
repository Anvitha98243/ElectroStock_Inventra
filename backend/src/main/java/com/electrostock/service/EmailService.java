package com.electrostock.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import jakarta.mail.internet.MimeMessage;

@Service
public class EmailService {

    @Autowired
    private JavaMailSender mailSender;

    @Value("${spring.mail.username}")
    private String fromEmail;

    private String header() {
        return "<table width='100%' cellpadding='0' cellspacing='0' style='background:#f0f4f8;padding:40px 0;'>" +
               "<tr><td align='center'>" +
               "<table width='480' cellpadding='0' cellspacing='0' style='background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);'>" +
               "<tr><td style='background:#0f172a;padding:28px 40px;text-align:center;'>" +
               "<div style='font-size:30px;margin-bottom:6px;'>&#9889;</div>" +
               "<div style='color:#ffffff;font-size:20px;font-weight:700;'>ElectroStock</div>" +
               "<div style='color:#64748b;font-size:12px;margin-top:3px;'>Smart Inventory Management</div>" +
               "</td></tr>";
    }

    private String footer(String toEmail) {
        return "<tr><td style='background:#f8fafc;border-top:1px solid #e5e7eb;padding:18px 40px;text-align:center;'>" +
               "<p style='margin:0;font-size:12px;color:#9ca3af;'>&copy; 2024 ElectroStock. Sent to " + toEmail + ".</p>" +
               "</td></tr></table></td></tr></table>";
    }

    private void sendHtml(String to, String subject, String body) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
            helper.setFrom(fromEmail);
            helper.setTo(to);
            helper.setSubject(subject);
            helper.setText("<!DOCTYPE html><html><head><meta charset='utf-8'/></head><body style='margin:0;padding:0;background:#f0f4f8;font-family:Arial,sans-serif;'>" +
                    header() + body + footer(to) + "</body></html>", true);
            mailSender.send(message);
        } catch (Exception e) {
            System.err.println("Email send failed: " + e.getMessage());
        }
    }

    @Async
    public void sendWelcomeEmail(String toEmail, String username, String role) {
        String roleLabel = "admin".equals(role) ? "&#128737; Admin" : "&#128100; Staff";
        String body = "<tr><td style='padding:36px 40px 32px;'>" +
                "<h2 style='margin:0 0 10px;font-size:22px;color:#111827;font-weight:700;'>Welcome to ElectroStock! &#127881;</h2>" +
                "<p style='margin:0 0 20px;font-size:15px;color:#4b5563;line-height:1.7;'>Hi <strong>" + username + "</strong>, your account has been created successfully.</p>" +
                "<table width='100%' style='margin-bottom:24px;'><tr><td style='background:#f8fafc;border:1px solid #e5e7eb;border-radius:10px;padding:16px 20px;'>" +
                "<table width='100%'>" +
                "<tr><td style='font-size:13px;color:#9ca3af;padding:4px 0;'>Username</td><td style='font-size:14px;color:#111827;font-weight:600;text-align:right;'>" + username + "</td></tr>" +
                "<tr><td style='font-size:13px;color:#9ca3af;padding:4px 0;'>Email</td><td style='font-size:14px;color:#111827;font-weight:600;text-align:right;'>" + toEmail + "</td></tr>" +
                "<tr><td style='font-size:13px;color:#9ca3af;padding:4px 0;'>Role</td><td style='font-size:14px;color:#111827;font-weight:600;text-align:right;'>" + roleLabel + "</td></tr>" +
                "</table></td></tr></table>" +
                "<p style='margin:0;font-size:13px;color:#9ca3af;line-height:1.6;'>If you did not create this account, please contact support immediately.</p>" +
                "</td></tr>";
        sendHtml(toEmail, "&#127881; Welcome to ElectroStock - Account Created", body);
    }

    public void sendOTPEmail(String toEmail, String username, String otp) {
        StringBuilder boxes = new StringBuilder();
        for (char c : otp.toCharArray()) {
            boxes.append("<td style='width:44px;height:52px;text-align:center;vertical-align:middle;background:#f0f4ff;border:2px solid #2563eb;border-radius:8px;font-size:26px;font-weight:800;color:#1d4ed8;'>")
                 .append(c).append("</td><td style='width:6px;'></td>");
        }
        String body = "<tr><td style='padding:36px 40px 32px;'>" +
                "<h2 style='margin:0 0 10px;font-size:22px;color:#111827;font-weight:700;'>Password Reset OTP</h2>" +
                "<p style='margin:0 0 24px;font-size:15px;color:#4b5563;line-height:1.7;'>Hi <strong>" + username + "</strong>, use the 6-digit OTP below. Expires in <strong>15 minutes</strong>.</p>" +
                "<table width='100%' style='margin-bottom:24px;'><tr><td align='center'><table cellpadding='0' cellspacing='0'><tr>" + boxes + "</tr></table></td></tr></table>" +
                "<div style='background:#fffbeb;border:1px solid #fcd34d;border-radius:8px;padding:12px 16px;margin-bottom:20px;'>" +
                "<p style='margin:0;font-size:13px;color:#92400e;'>&#9200; Do not share this OTP with anyone.</p></div>" +
                "<p style='margin:0;font-size:13px;color:#9ca3af;'>If you did not request this, ignore this email.</p>" +
                "</td></tr>";
        sendHtml(toEmail, "&#128272; Your ElectroStock Password Reset OTP", body);
    }
}
