package com.electrostock.service;

import com.electrostock.model.*;
import com.electrostock.repository.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.*;

@Service
public class PredictionService {

    @Autowired
    private ProductRepository productRepository;
    @Autowired
    private StockRequestRepository requestRepository;
    @Autowired
    private UserRepository userRepository;

    public List<Map<String, Object>> predict(String username) {
        User admin = userRepository.findByUsername(username).orElseThrow();
        List<Product> products = productRepository.findByAdmin(admin);
        LocalDateTime since = LocalDateTime.now().minusDays(90);
        long nowMs = System.currentTimeMillis();

        List<StockRequest> allRequests = requestRepository
                .findByAdminAndStatusAndResolvedAtAfter(admin, "approved", since);

        List<Map<String, Object>> results = new ArrayList<>();

        for (Product p : products) {

            // ── all approved txns for this product ──────────────────────────
            List<StockRequest> txns = allRequests.stream()
                    .filter(r -> r.getProduct() != null
                            && r.getProduct().getId().equals(p.getId()))
                    .sorted(Comparator.comparing(StockRequest::getResolvedAt))
                    .toList();

            List<StockRequest> outTxns = txns.stream()
                    .filter(r -> "stock-out".equals(r.getType())).toList();

            List<StockRequest> inTxns = txns.stream()
                    .filter(r -> "stock-in".equals(r.getType())).toList();

            // ── bucket stock-out demand into 3 x 30-day windows ─────────────
            // bucket0 = 61-90 days ago (oldest)
            // bucket1 = 31-60 days ago
            // bucket2 = 0-30 days ago (most recent)
            int bucket0 = 0, bucket1 = 0, bucket2 = 0;
            for (StockRequest r : outTxns) {
                long ms = r.getResolvedAt()
                        .atZone(java.time.ZoneId.systemDefault())
                        .toInstant().toEpochMilli();
                double daysAgo = (nowMs - ms) / 86400000.0;
                if (daysAgo <= 30)
                    bucket2 += r.getQuantity();
                else if (daysAgo <= 60)
                    bucket1 += r.getQuantity();
                else
                    bucket0 += r.getQuantity();
            }

            // ── weighted average daily consumption (recent = higher weight) ─
            // weights: oldest=1, mid=2, recent=3 → normaliser = 30*(1+2+3)=180
            double weightedAvgDaily = (bucket0 * 1.0 + bucket1 * 2.0 + bucket2 * 3.0) / 180.0;

            // fallback: plain 90-day average when no recent data
            double plainAvgDaily = outTxns.stream().mapToInt(StockRequest::getQuantity).sum() / 90.0;

            // use weighted if we have any data, otherwise plain
            double avgDaily = outTxns.isEmpty() ? 0 : Math.max(weightedAvgDaily, plainAvgDaily * 0.5);

            // ── trend detection ──────────────────────────────────────────────
            // Strategy: score each period transition, combine with stock health
            String trend;
            String trendDetail;

            if (outTxns.isEmpty()) {
                // no stock-out history → classify purely by stock health
                if (p.getQuantity() <= p.getMinThreshold()) {
                    trend = "rising";
                    trendDetail = "Stock is at or below minimum threshold — demand likely exceeds supply.";
                } else {
                    trend = "falling";
                    trendDetail = "No outgoing stock recorded in 90 days — demand appears to be declining.";
                }
            } else {
                // score-based trend: compare consecutive buckets
                // +2 = strong rise, +1 = mild rise, -1 = mild fall, -2 = strong fall
                int score = 0;

                // compare bucket1 vs bucket0
                if (bucket0 == 0 && bucket1 > 0) {
                    score += 2; // new demand appeared
                } else if (bucket0 > 0 && bucket1 == 0) {
                    score -= 2; // demand disappeared
                } else if (bucket0 > 0) {
                    double change01 = (double) (bucket1 - bucket0) / bucket0;
                    if (change01 >= 0.20)
                        score += 2;
                    else if (change01 >= 0.05)
                        score += 1;
                    else if (change01 <= -0.20)
                        score -= 2;
                    else if (change01 <= -0.05)
                        score -= 1;
                }

                // compare bucket2 vs bucket1 (more weight — recent)
                if (bucket1 == 0 && bucket2 > 0) {
                    score += 3; // demand just appeared
                } else if (bucket1 > 0 && bucket2 == 0) {
                    score -= 3; // demand just stopped
                } else if (bucket1 > 0) {
                    double change12 = (double) (bucket2 - bucket1) / bucket1;
                    if (change12 >= 0.20)
                        score += 3;
                    else if (change12 >= 0.05)
                        score += 2;
                    else if (change12 <= -0.20)
                        score -= 3;
                    else if (change12 <= -0.05)
                        score -= 2;
                }

                // stock health bonus: if currently below threshold, push toward rising
                if (p.getQuantity() < p.getMinThreshold())
                    score += 1;

                // final classification — everything is either rising or falling
                if (score >= 0) {
                    trend = "rising";
                    if (bucket2 > bucket1 && bucket1 > 0) {
                        int pct = (int) (((double) (bucket2 - bucket1) / bucket1) * 100);
                        trendDetail = "Demand grew by " + pct + "% — from "
                                + bucket1 + " to " + bucket2 + " units in the last 30 days.";
                    } else if (bucket2 > 0 && bucket1 == 0) {
                        trendDetail = "New demand detected: " + bucket2
                                + " units consumed in the last 30 days.";
                    } else if (bucket2 == bucket1 && bucket2 > 0) {
                        trendDetail = "Demand holding steady at " + bucket2
                                + " units/month — classified as rising to prompt restocking.";
                    } else {
                        trendDetail = "Overall consumption pattern suggests rising or steady demand.";
                    }
                } else {
                    trend = "falling";
                    if (bucket1 > bucket2 && bucket2 >= 0) {
                        int drop = bucket1 - bucket2;
                        trendDetail = "Demand dropped by " + drop + " units — from "
                                + bucket1 + " to " + bucket2 + " units in the last 30 days.";
                    } else if (bucket2 == 0 && bucket1 > 0) {
                        trendDetail = "No stock-out recorded in last 30 days (was "
                                + bucket1 + " units prior) — demand falling sharply.";
                    } else {
                        trendDetail = "Overall consumption pattern indicates declining demand.";
                    }
                }
            }

            // ── reorder recommendation ───────────────────────────────────────
            Integer reorderDays;
            String reorderNote;
            String reorderDate;
            int suggestedQty;

            if (avgDaily > 0) {
                // days until stock hits safety threshold
                double daysUntilSafety = (p.getQuantity() - p.getMinThreshold()) / avgDaily;
                // subtract 7-day lead time buffer
                int daysUntilReorder = (int) Math.max(0, daysUntilSafety - 7);
                reorderDays = daysUntilReorder;
                reorderDate = LocalDateTime.now().plusDays(reorderDays).toLocalDate().toString();

                if (reorderDays == 0) {
                    reorderNote = "Reorder NOW — stock will reach safety level before next delivery window.";
                } else if (reorderDays <= 3) {
                    reorderNote = "Reorder within " + reorderDays + " day(s) to avoid stockout.";
                } else if (reorderDays <= 7) {
                    reorderNote = "Place order this week by " + reorderDate + " to stay above threshold.";
                } else {
                    reorderNote = "Next reorder due by " + reorderDate + " to maintain safe stock levels.";
                }

                // suggested qty: cover 30 days of weighted demand + refill to threshold
                suggestedQty = (int) Math.max(0,
                        Math.ceil(avgDaily * 30 + p.getMinThreshold() - p.getQuantity()));

            } else if (p.getQuantity() < p.getMinThreshold()) {
                // no consumption data but already below threshold
                reorderDays = 0;
                reorderDate = LocalDateTime.now().toLocalDate().toString();
                reorderNote = "Currently below minimum threshold — reorder immediately.";
                suggestedQty = p.getMinThreshold() * 2;
            } else {
                // no consumption and stock is healthy
                reorderDays = null;
                reorderDate = null;
                reorderNote = "No consumption recorded — monitor and reorder when activity is detected.";
                suggestedQty = p.getMinThreshold();
            }

            // ── assemble result map ──────────────────────────────────────────
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("productId", p.getId());
            m.put("name", p.getName());
            m.put("sku", p.getSku());
            m.put("category", p.getCategory());
            m.put("currentStock", p.getQuantity());
            m.put("minThreshold", p.getMinThreshold());
            m.put("price", p.getPrice());
            m.put("totalStockOut", outTxns.stream().mapToInt(StockRequest::getQuantity).sum());
            m.put("totalStockIn", inTxns.stream().mapToInt(StockRequest::getQuantity).sum());
            m.put("transactionCount", txns.size());
            m.put("avgDailyConsumption", Math.round(avgDaily * 100.0) / 100.0);
            m.put("trend", trend);
            m.put("trendDetail", trendDetail);
            m.put("demandLast30Days", bucket2);
            m.put("demandPrev30Days", bucket1);
            m.put("demandOldest30Days", bucket0);
            m.put("reorderDate", reorderDate);
            m.put("reorderDaysFromNow", reorderDays);
            m.put("reorderNote", reorderNote);
            m.put("suggestedQty", suggestedQty);
            results.add(m);
        }

        // sort: urgent reorders first, then by reorderDays ascending, nulls last
        results.sort(Comparator.comparingInt(m -> {
            Object d = m.get("reorderDaysFromNow");
            return d == null ? 9999 : (Integer) d;
        }));

        return results;
    }
}