package org.example.backend.dto;

import java.math.BigDecimal;
import java.util.List;

/**
 * F10.2 – Thống kê khoản đóng góp tự nguyện theo một đợt thu.
 * Chỉ liệt kê các hộ thực sự có đóng góp (amount_paid > 0).
 */
public record DonationStatisticsDTO(
        Long feePeriodId,
        String feePeriodName,
        String feeName,
        int contributorCount,
        BigDecimal totalAmount,
        List<DonationContributionDTO> contributions
) {}
