package org.example.backend.dto;

import java.math.BigDecimal;

/**
 * Kết quả sinh hóa đơn phí gửi xe theo tháng.
 *  - feePeriodId / feePeriodName: đợt thu vừa tạo (xem ở trang Thu phí / Công nợ).
 *  - invoiceCount: số hộ được sinh phiếu nộp (chỉ hộ có lượt gửi xe đang hiệu lực).
 *  - totalAmount: tổng số tiền phải thu của đợt.
 */
public record ParkingFeeGenerationResultDTO(
        Long feePeriodId,
        String feePeriodName,
        int invoiceCount,
        BigDecimal totalAmount
) {}
