package com.electrostock.service;

import com.electrostock.model.*;
import com.electrostock.repository.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.*;

@Service
public class PredictionService {

    @Autowired private ProductRepository productRepository;
    @Autowired private StockRequestRepository requestRepository;
    @Autowired private UserRepository userRepository;

    public List<Map<String, Object>> predict(String username) {
        User admin = userRepository.findByUsername(username).orElseThrow();
        List<Product> products = productRepository.findByAdmin(admin);
        LocalDateTime since = LocalDateTime.now().minusDays(90);

        List<StockRequest> allRequests = requestRepository
                .findByAdminAndStatusAndResolvedAtAfter(admin, "approved", since);

        List<Map<String, Object>> results = new ArrayList<>();

        for (Product p : products) {
            List<StockRequest> txns = allRequests.stream()
                    .filter(r -> r.getProduct() != null && r.getProduct().getId().equals(p.getId()))
                    .sorted(Comparator.comparing(StockRequest::getResolvedAt))
                    .toList();

            List<StockRequest> outTxns = txns.stream().filter(r -> "stock-out".equals(r.getType())).toList();

            long now = System.currentTimeMillis();
            int bucket0 = 0, bucket1 = 0, bucket2 = 0;
            for (StockRequest r : outTxns) {
                long resolvedMs = r.getResolvedAt().atZone(java.time.ZoneId.systemDefault()).toInstant().toEpochMilli();
                double daysAgo = (now - resolvedMs) / 86400000.0;
                if (daysAgo <= 30) bucket2 += r.getQuantity();
                else if (daysAgo <= 60) bucket1 += r.getQuantity();
                else bucket0 += r.getQuantity();
            }

            String trend;
            String trendDetail;
            if (outTxns.isEmpty()) {
                trend = "no-data";
                trendDetail = "No stock-out transactions recorded yet.";
            } else if (bucket2 > bucket1 * 1.25 || (bucket1 == 0 && bucket2 > 0)) {
                trend = "increasing";
                trendDetail = "Demand rose from " + bucket1 + " to " + bucket2 + " units in the last 30 days.";
            } else if (bucket2 < bucket1 * 0.75 && bucket1 > 0) {
                trend = "decreasing";
                trendDetail = "Demand dropped from " + bucket1 + " to " + bucket2 + " units in the last 30 days.";
            } else {
                trend = "stable";
                int avg = (bucket0 + bucket1 + bucket2) / 3;
                trendDetail = "Consistent demand around " + avg + " units per 30 days.";
            }

            double avgDaily = outTxns.stream()
                    .filter(r -> {
                        long ms = r.getResolvedAt().atZone(java.time.ZoneId.systemDefault()).toInstant().toEpochMilli();
                        return (now - ms) / 86400000.0 <= 30;
                    })
                    .mapToInt(StockRequest::getQuantity).sum() / 30.0;

            if (avgDaily == 0 && !outTxns.isEmpty()) {
                avgDaily = outTxns.stream().mapToInt(StockRequest::getQuantity).sum() / 90.0;
            }

            Integer reorderDays = null;
            String reorderNote;
            String reorderDate = null;
            int suggestedQty;

            if (avgDaily > 0) {
                int daysUntilSafety = (int) Math.max(0, (p.getQuantity() - p.getMinThreshold()) / avgDaily);
                reorderDays = Math.max(0, daysUntilSafety - 7);
                LocalDateTime rd = LocalDateTime.now().plusDays(reorderDays);
                reorderDate = rd.toLocalDate().toString();

                if (reorderDays == 0) reorderNote = "Reorder now — stock will hit safety level before next delivery.";
                else if (reorderDays <= 3) reorderNote = "Reorder within " + reorderDays + " day(s) to avoid stockout.";
                else reorderNote = "Place order by " + reorderDate + " to maintain safe stock.";

                suggestedQty = (int) Math.max(0, Math.ceil(avgDaily * 30 + p.getMinThreshold() - p.getQuantity()));
            } else if (p.getQuantity() < p.getMinThreshold()) {
                reorderDays = 0;
                reorderDate = LocalDateTime.now().toLocalDate().toString();
                reorderNote = "Currently below minimum threshold. Reorder recommended immediately.";
                suggestedQty = p.getMinThreshold() * 2;
            } else {
                reorderNote = "No consumption recorded — monitor and reorder when needed.";
                suggestedQty = p.getMinThreshold() * 2;
            }

            Map<String, Object> m = new LinkedHashMap<>();
            m.put("productId", p.getId());
            m.put("name", p.getName());
            m.put("sku", p.getSku());
            m.put("category", p.getCategory());
            m.put("currentStock", p.getQuantity());
            m.put("minThreshold", p.getMinThreshold());
            m.put("price", p.getPrice());
            m.put("totalStockOut", outTxns.stream().mapToInt(StockRequest::getQuantity).sum());
            m.put("totalStockIn", txns.stream().filter(r -> "stock-in".equals(r.getType())).mapToInt(StockRequest::getQuantity).sum());
            m.put("transactionCount", txns.size());
            m.put("avgDailyConsumption", Math.round(avgDaily * 100.0) / 100.0);
            m.put("trend", trend);
            m.put("trendDetail", trendDetail);
            m.put("demandLast30Days", bucket2);
            m.put("demandPrev30Days", bucket1);
            m.put("reorderDate", reorderDate);
            m.put("reorderDaysFromNow", reorderDays);
            m.put("reorderNote", reorderNote);
            m.put("suggestedQty", suggestedQty);
            results.add(m);
        }

        results.sort(Comparator.comparingInt(m -> {
            Object d = m.get("reorderDaysFromNow");
            return d == null ? 9999 : (Integer) d;
        }));

        return results;
    }
}
