package com.electrostock.controller;

import com.electrostock.service.LogService;
import com.electrostock.service.PredictionService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

@RestController
public class LogAndPredictionController {

    @Autowired private LogService logService;
    @Autowired private PredictionService predictionService;

    @GetMapping("/api/logs")
    public ResponseEntity<?> auditLogs(@AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(logService.getAuditLogs(userDetails.getUsername()));
    }

    @GetMapping("/api/logs/transactions")
    public ResponseEntity<?> transactionLogs(@AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(logService.getTransactionLogs(userDetails.getUsername()));
    }

    @GetMapping("/api/predictions")
    public ResponseEntity<?> predictions(@AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(predictionService.predict(userDetails.getUsername()));
    }
}
