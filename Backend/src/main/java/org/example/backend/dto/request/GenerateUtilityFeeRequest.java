package org.example.backend.dto.request;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

/**
 * Body cho POST /api/admin/utility-fees/generate.
 * Tạo một đợt thu "Phí điện nước" cho tháng/năm chỉ định và sinh phiếu nộp cho mỗi hộ
 * dựa trên tổng số tiền các hóa đơn điện/nước/internet CHƯA NỘP của hộ đó trong tháng.
 */
public record GenerateUtilityFeeRequest(
        @NotNull(message = "Tháng không được để trống")
        @Min(value = 1, message = "Tháng phải từ 1 đến 12")
        @Max(value = 12, message = "Tháng phải từ 1 đến 12")
        Integer month,

        @NotNull(message = "Năm không được để trống")
        @Min(value = 2000, message = "Năm không hợp lệ")
        Integer year
) {}
