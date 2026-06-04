package org.example.backend.dto;

import java.math.BigDecimal;

/**
 * F10.1 – Thống kê tình trạng một đợt thu phí.
 * Tổng số phiếu nộp đã sinh cho đợt = số hộ phải nộp (với khoản MANDATORY).
 */
public record FeePeriodStatisticsDTO(
        Long feePeriodId,
        String feePeriodName,
        String feeName,
        String feeType,
        String periodStatus,        // OPEN / CLOSED
        long totalHouseholds,       // tổng số phiếu nộp
        long paidCount,             // số hộ đã nộp
        long unpaidCount,           // số hộ chưa nộp
        BigDecimal totalDue,        // tổng tiền phải thu
        BigDecimal totalCollected,  // tổng tiền đã thu
        BigDecimal totalOutstanding,// còn phải thu = totalDue - totalCollected
        double collectionRate       // tỉ lệ hộ đã nộp (%)
) {}
