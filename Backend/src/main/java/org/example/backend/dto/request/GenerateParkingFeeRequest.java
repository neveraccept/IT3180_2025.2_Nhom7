package org.example.backend.dto.request;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

/**
 * Body cho POST /api/admin/parking-fees/generate.
 * Tạo một đợt thu "Phí gửi xe" cho tháng/năm chỉ định và sinh phiếu nộp cho mỗi hộ
 * dựa trên tổng phí tháng (monthlyFee) các lượt gửi xe đang hiệu lực của hộ đó.
 */
public record GenerateParkingFeeRequest(
        @NotNull(message = "Tháng không được để trống")
        @Min(value = 1, message = "Tháng phải từ 1 đến 12")
        @Max(value = 12, message = "Tháng phải từ 1 đến 12")
        Integer month,

        @NotNull(message = "Năm không được để trống")
        @Min(value = 2000, message = "Năm không hợp lệ")
        Integer year
) {}
