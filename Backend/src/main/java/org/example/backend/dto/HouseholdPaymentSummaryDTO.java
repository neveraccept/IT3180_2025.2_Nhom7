package org.example.backend.dto;

import java.math.BigDecimal;

/**
 * F10.3 – Thống kê theo hộ gia đình: tổng phải nộp / đã nộp / còn nợ
 * cộng dồn trên tất cả các phiếu nộp của hộ.
 */
public record HouseholdPaymentSummaryDTO(
        Long householdId,
        String householdCode,
        String headName,
        String apartmentCode,
        BigDecimal totalDue,
        BigDecimal totalPaid,
        BigDecimal outstanding,
        long unpaidCount,
        long paymentCount
) {}
