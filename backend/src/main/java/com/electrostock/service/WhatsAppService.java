package com.electrostock.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.Base64;

@Service
public class WhatsAppService {

    @Value("${twilio.account.sid:}")
    private String accountSid;

    @Value("${twilio.auth.token:}")
    private String authToken;

    @Value("${twilio.whatsapp.from:}")
    private String fromNumber;

    // returns true if Twilio is configured
    private boolean isConfigured() {
        return accountSid != null && !accountSid.isBlank()
                && authToken != null && !authToken.isBlank()
                && fromNumber != null && !fromNumber.isBlank();
    }

    // ── Send a WhatsApp message via Twilio API ────────────────────────────────
    @Async
    public void sendMessage(String toNumber, String message) {
        if (!isConfigured()) {
            System.out.println("[WhatsApp] Twilio not configured — skipping: " + message);
            return;
        }
        if (toNumber == null || toNumber.isBlank()) {
            System.out.println("[WhatsApp] No phone number — skipping.");
            return;
        }
        try {
            String url = "https://api.twilio.com/2010-04-01/Accounts/"
                    + accountSid + "/Messages.json";

            String body = "From=whatsapp%3A%2B" + fromNumber.replace("+", "")
                    + "&To=whatsapp%3A%2B" + toNumber.replace("+", "")
                    + "&Body=" + java.net.URLEncoder.encode(message,
                            java.nio.charset.StandardCharsets.UTF_8);

            String credentials = Base64.getEncoder().encodeToString(
                    (accountSid + ":" + authToken).getBytes());

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(url))
                    .header("Authorization", "Basic " + credentials)
                    .header("Content-Type", "application/x-www-form-urlencoded")
                    .POST(HttpRequest.BodyPublishers.ofString(body))
                    .build();

            HttpResponse<String> response = HttpClient.newHttpClient()
                    .send(request, HttpResponse.BodyHandlers.ofString());

            if (response.statusCode() == 201) {
                System.out.println("[WhatsApp] Sent successfully to " + toNumber);
            } else {
                System.out.println("[WhatsApp] Failed: " + response.body());
            }
        } catch (Exception e) {
            System.err.println("[WhatsApp] Error: " + e.getMessage());
        }
    }

    // ── Convenience methods ───────────────────────────────────────────────────

    @Async
    public void sendLowStockAlert(String toNumber, String adminUsername,
            String productName, int quantity, int minThreshold) {
        String msg = "⚡ *ElectroStock Alert*\n\n"
                + "Hi " + adminUsername + ",\n"
                + "🚨 *Low Stock Warning*\n\n"
                + "Product: *" + productName + "*\n"
                + "Current Stock: *" + quantity + " units*\n"
                + "Minimum Threshold: *" + minThreshold + " units*\n\n"
                + "Please restock this item to avoid disruption.";
        sendMessage(toNumber, msg);
    }

    @Async
    public void sendRequestApprovedAlert(String toNumber, String staffUsername,
            String productName, int quantity, String type) {
        String msg = "⚡ *ElectroStock*\n\n"
                + "Hi " + staffUsername + ",\n"
                + "✅ *Request Approved!*\n\n"
                + "Your " + type + " request for\n"
                + "Product: *" + productName + "*\n"
                + "Quantity: *" + quantity + " units*\n"
                + "has been *approved*. ✅";
        sendMessage(toNumber, msg);
    }

    @Async
    public void sendRequestRejectedAlert(String toNumber, String staffUsername,
            String productName, int quantity,
            String type, String adminNote) {
        String msg = "⚡ *ElectroStock*\n\n"
                + "Hi " + staffUsername + ",\n"
                + "❌ *Request Rejected*\n\n"
                + "Your " + type + " request for\n"
                + "Product: *" + productName + "*\n"
                + "Quantity: *" + quantity + " units*\n"
                + "has been *rejected*.\n\n"
                + (adminNote != null && !adminNote.isBlank()
                        ? "Admin note: " + adminNote
                        : "");
        sendMessage(toNumber, msg);
    }

    @Async
    public void sendNewRequestAlert(String toNumber, String adminUsername,
            String staffUsername, String productName,
            int quantity, String type) {
        String msg = "⚡ *ElectroStock*\n\n"
                + "Hi " + adminUsername + ",\n"
                + "📋 *New Stock Request*\n\n"
                + "Staff: *" + staffUsername + "*\n"
                + "Product: *" + productName + "*\n"
                + "Type: *" + type + "*\n"
                + "Quantity: *" + quantity + " units*\n\n"
                + "Please review in your dashboard.";
        sendMessage(toNumber, msg);
    }
}