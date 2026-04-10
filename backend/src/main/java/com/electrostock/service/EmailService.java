package com.electrostock.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import jakarta.mail.internet.MimeMessage;
import java.util.List;
import java.util.Map;

@Service
public class EmailService {

    @Autowired
    private JavaMailSender mailSender;

    @Value("${spring.mail.username}")
    private String fromEmail;

    private String header() {
        return "<table width='100%' cellpadding='0' cellspacing='0' style='background:#f0f4f8;padding:40px 0;'>" +
                "<tr><td align='center'>" +
                "<table width='480' cellpadding='0' cellspacing='0' style='background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);'>"
                +
                "<tr><td style='background:#0f172a;padding:28px 40px;text-align:center;'>" +
                "<div style='font-size:30px;margin-bottom:6px;'>&#9889;</div>" +
                "<div style='color:#ffffff;font-size:20px;font-weight:700;'>ElectroStock</div>" +
                "<div style='color:#64748b;font-size:12px;margin-top:3px;'>Smart Inventory Management</div>" +
                "</td></tr>";
    }

    private String footer(String toEmail) {
        return "<tr><td style='background:#f8fafc;border-top:1px solid #e5e7eb;padding:18px 40px;text-align:center;'>" +
                "<p style='margin:0;font-size:12px;color:#9ca3af;'>&copy; 2024 ElectroStock. Sent to " + toEmail
                + ".</p>" +
                "</td></tr></table></td></tr></table>";
    }

    private void sendHtml(String to, String subject, String body) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
            helper.setFrom(fromEmail);
            helper.setTo(to);
            helper.setSubject(subject);
            helper.setText(
                    "<!DOCTYPE html><html><head><meta charset='utf-8'/></head><body style='margin:0;padding:0;background:#f0f4f8;font-family:Arial,sans-serif;'>"
                            +
                            header() + body + footer(to) + "</body></html>",
                    true);
            mailSender.send(message);
        } catch (Exception e) {
            System.err.println("Email send failed: " + e.getMessage());
        }
    }

    @Async
    public void sendWelcomeEmail(String toEmail, String username, String role) {
        String roleLabel = "admin".equals(role) ? "&#128737; Admin" : "&#128100; Staff";
        String body = "<tr><td style='padding:36px 40px 32px;'>" +
                "<h2 style='margin:0 0 10px;font-size:22px;color:#111827;font-weight:700;'>Welcome to ElectroStock! &#127881;</h2>"
                +
                "<p style='margin:0 0 20px;font-size:15px;color:#4b5563;line-height:1.7;'>Hi <strong>" + username
                + "</strong>, your account has been created successfully.</p>" +
                "<table width='100%' style='margin-bottom:24px;'><tr><td style='background:#f8fafc;border:1px solid #e5e7eb;border-radius:10px;padding:16px 20px;'>"
                +
                "<table width='100%'>" +
                "<tr><td style='font-size:13px;color:#9ca3af;padding:4px 0;'>Username</td><td style='font-size:14px;color:#111827;font-weight:600;text-align:right;'>"
                + username + "</td></tr>" +
                "<tr><td style='font-size:13px;color:#9ca3af;padding:4px 0;'>Email</td><td style='font-size:14px;color:#111827;font-weight:600;text-align:right;'>"
                + toEmail + "</td></tr>" +
                "<tr><td style='font-size:13px;color:#9ca3af;padding:4px 0;'>Role</td><td style='font-size:14px;color:#111827;font-weight:600;text-align:right;'>"
                + roleLabel + "</td></tr>" +
                "</table></td></tr></table>" +
                "<p style='margin:0;font-size:13px;color:#9ca3af;line-height:1.6;'>If you did not create this account, please contact support immediately.</p>"
                +
                "</td></tr>";
        sendHtml(toEmail, "&#127881; Welcome to ElectroStock - Account Created", body);
    }

    public void sendOTPEmail(String toEmail, String username, String otp) {
        StringBuilder boxes = new StringBuilder();
        for (char c : otp.toCharArray()) {
            boxes.append(
                    "<td style='width:44px;height:52px;text-align:center;vertical-align:middle;background:#f0f4ff;border:2px solid #2563eb;border-radius:8px;font-size:26px;font-weight:800;color:#1d4ed8;'>")
                    .append(c).append("</td><td style='width:6px;'></td>");
        }
        String body = "<tr><td style='padding:36px 40px 32px;'>" +
                "<h2 style='margin:0 0 10px;font-size:22px;color:#111827;font-weight:700;'>Password Reset OTP</h2>" +
                "<p style='margin:0 0 24px;font-size:15px;color:#4b5563;line-height:1.7;'>Hi <strong>" + username
                + "</strong>, use the 6-digit OTP below. Expires in <strong>15 minutes</strong>.</p>" +
                "<table width='100%' style='margin-bottom:24px;'><tr><td align='center'><table cellpadding='0' cellspacing='0'><tr>"
                + boxes + "</tr></table></td></tr></table>" +
                "<div style='background:#fffbeb;border:1px solid #fcd34d;border-radius:8px;padding:12px 16px;margin-bottom:20px;'>"
                +
                "<p style='margin:0;font-size:13px;color:#92400e;'>&#9200; Do not share this OTP with anyone.</p></div>"
                +
                "<p style='margin:0;font-size:13px;color:#9ca3af;'>If you did not request this, ignore this email.</p>"
                +
                "</td></tr>";
        sendHtml(toEmail, "&#128272; Your ElectroStock Password Reset OTP", body);
    }

    @Async
    public void sendLowStockAlertEmail(String toEmail, String adminUsername,
            List<Map<String, Object>> lowStockProducts) {
        StringBuilder rows = new StringBuilder();
        for (Map<String, Object> p : lowStockProducts) {
            int qty = Integer.parseInt(p.get("quantity").toString());
            String statusColor = qty == 0 ? "#dc2626" : "#d97706";
            String statusLabel = qty == 0 ? "OUT OF STOCK" : "LOW STOCK";
            rows.append("<tr>")
                    .append("<td style='padding:10px 14px;border-bottom:1px solid #f3f4f6;font-weight:500;color:#111827;'>")
                    .append(p.get("name")).append("</td>")
                    .append("<td style='padding:10px 14px;border-bottom:1px solid #f3f4f6;'>")
                    .append("<code style='background:#f3f4f6;padding:2px 6px;border-radius:4px;font-size:12px;'>")
                    .append(p.get("sku")).append("</code></td>")
                    .append("<td style='padding:10px 14px;border-bottom:1px solid #f3f4f6;color:#6b7280;'>")
                    .append(p.get("category")).append("</td>")
                    .append("<td style='padding:10px 14px;border-bottom:1px solid #f3f4f6;font-weight:700;color:")
                    .append(statusColor).append(";font-size:16px;'>").append(qty).append("</td>")
                    .append("<td style='padding:10px 14px;border-bottom:1px solid #f3f4f6;color:#9ca3af;'>")
                    .append(p.get("minThreshold")).append("</td>")
                    .append("<td style='padding:10px 14px;border-bottom:1px solid #f3f4f6;'>")
                    .append("<span style='background:").append(statusColor)
                    .append("1a;color:").append(statusColor)
                    .append(";padding:3px 10px;border-radius:99px;font-size:11px;font-weight:600;'>")
                    .append(statusLabel).append("</span></td>")
                    .append("</tr>");
        }

        String body = "<tr><td style='padding:36px 40px 32px;'>"
                + "<h2 style='margin:0 0 10px;font-size:22px;color:#111827;font-weight:700;'>&#9888; Stock Alert</h2>"
                + "<p style='margin:0 0 20px;font-size:15px;color:#4b5563;line-height:1.7;'>Hi <strong>"
                + adminUsername + "</strong>, the following product(s) in your inventory are running "
                + "<strong>low or out of stock</strong> and need your attention.</p>"
                + "<div style='background:#fffbeb;border:1px solid #fcd34d;border-radius:8px;"
                + "padding:12px 16px;margin-bottom:20px;'>"
                + "<p style='margin:0;font-size:13px;color:#92400e;'>&#128276; "
                + lowStockProducts.size() + " product(s) require restocking.</p></div>"
                + "<table width='100%' cellpadding='0' cellspacing='0' "
                + "style='border:1px solid #e5e7eb;border-radius:10px;overflow:hidden;border-collapse:collapse;'>"
                + "<thead><tr style='background:#f8fafc;'>"
                + "<th style='padding:10px 14px;text-align:left;font-size:11px;color:#9ca3af;"
                + "font-weight:600;text-transform:uppercase;letter-spacing:0.05em;'>Product</th>"
                + "<th style='padding:10px 14px;text-align:left;font-size:11px;color:#9ca3af;"
                + "font-weight:600;text-transform:uppercase;letter-spacing:0.05em;'>SKU</th>"
                + "<th style='padding:10px 14px;text-align:left;font-size:11px;color:#9ca3af;"
                + "font-weight:600;text-transform:uppercase;letter-spacing:0.05em;'>Category</th>"
                + "<th style='padding:10px 14px;text-align:left;font-size:11px;color:#9ca3af;"
                + "font-weight:600;text-transform:uppercase;letter-spacing:0.05em;'>Qty</th>"
                + "<th style='padding:10px 14px;text-align:left;font-size:11px;color:#9ca3af;"
                + "font-weight:600;text-transform:uppercase;letter-spacing:0.05em;'>Min</th>"
                + "<th style='padding:10px 14px;text-align:left;font-size:11px;color:#9ca3af;"
                + "font-weight:600;text-transform:uppercase;letter-spacing:0.05em;'>Status</th>"
                + "</tr></thead><tbody>" + rows + "</tbody></table>"
                + "<p style='margin:20px 0 0;font-size:13px;color:#9ca3af;line-height:1.6;'>"
                + "Please restock these items or approve pending stock-in requests to avoid disruptions.</p>"
                + "</td></tr>";

        sendHtml(toEmail,
                "&#9888; ElectroStock Alert — " + lowStockProducts.size() + " Product(s) Need Restocking",
                body);
    }

    @Async
    public void sendRegistrationOTPEmail(String toEmail, String username, String otp) {
        StringBuilder boxes = new StringBuilder();
        for (char c : otp.toCharArray()) {
            boxes.append("<td style='width:44px;height:52px;text-align:center;vertical-align:middle;"
                    + "background:#f0fdf4;border:2px solid #16a34a;border-radius:8px;"
                    + "font-size:26px;font-weight:800;color:#15803d;'>")
                    .append(c).append("</td><td style='width:6px;'></td>");
        }
        String body = "<tr><td style='padding:36px 40px 32px;'>"
                + "<h2 style='margin:0 0 10px;font-size:22px;color:#111827;font-weight:700;'>"
                + "Verify Your Email &#9989;</h2>"
                + "<p style='margin:0 0 24px;font-size:15px;color:#4b5563;line-height:1.7;'>"
                + "Hi <strong>" + username + "</strong>, use this 6-digit OTP to verify your email "
                + "and complete registration. Expires in <strong>10 minutes</strong>.</p>"
                + "<table width='100%' style='margin-bottom:24px;'>"
                + "<tr><td align='center'><table cellpadding='0' cellspacing='0'><tr>"
                + boxes + "</tr></table></td></tr></table>"
                + "<div style='background:#f0fdf4;border:1px solid #86efac;border-radius:8px;"
                + "padding:12px 16px;margin-bottom:20px;'>"
                + "<p style='margin:0;font-size:13px;color:#15803d;'>"
                + "&#128994; This OTP confirms your email address is valid.</p></div>"
                + "<p style='margin:0;font-size:13px;color:#9ca3af;'>"
                + "If you did not try to register, ignore this email.</p>"
                + "</td></tr>";
        sendHtml(toEmail, "&#9989; Verify your ElectroStock account", body);
    }
}