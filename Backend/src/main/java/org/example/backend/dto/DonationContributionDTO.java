package org.example.backend.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

/**
 * Một dòng đóng góp của một hộ trong báo cáo khoản đóng góp (F10.2).
 */
public record DonationContributionDTO(
        String householdCode,
        String headName,
        String apartmentCode,
        BigDecimal amount,
        LocalDate paidDate
) {}
