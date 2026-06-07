package org.example.backend.dto;

import java.math.BigDecimal;
import java.util.List;

/**
 * F10.2 – Thống kê khoản đóng góp tự nguyện theo một KHOẢN THU (Fee type=DONATION).
 * Gom toàn bộ đóng góp của khoản này qua mọi đợt; chỉ liệt kê hộ thực sự đã đóng (amount_paid > 0).
 */
public record DonationStatisticsDTO(
        Long feeId,
        String feeName,
        int contributorCount,
        BigDecimal totalAmount,
        List<DonationContributionDTO> contributions
) {}
