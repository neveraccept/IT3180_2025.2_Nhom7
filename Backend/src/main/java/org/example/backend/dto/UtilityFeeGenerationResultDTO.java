package org.example.backend.dto;

import java.math.BigDecimal;

/**
 * Kết quả sinh hoá đơn phí điện/nước theo tháng (gắn vào hệ thống Thu phí).
 *  - feePeriodId / feePeriodName: đợt thu vừa tạo (xem ở trang Thu phí / Công nợ).
 *  - invoiceCount: số hộ được sinh phiếu nộp (chỉ hộ có hoá đơn điện/nước chưa nộp trong tháng).
 *  - totalAmount: tổng số tiền phải thu của đợt.
 */
public record UtilityFeeGenerationResultDTO(
        Long feePeriodId,
        String feePeriodName,
        int invoiceCount,
        BigDecimal totalAmount
) {}
