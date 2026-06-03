package org.example.backend.dto.request;

import org.example.backend.entity.enums.UtilityType;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;

import java.math.BigDecimal;

/**
 * F7.2 – Sửa hoá đơn (chỉ áp dụng khi hoá đơn còn UNPAID).
 * Trường null = giữ nguyên. Không cho đổi hộ sở hữu hoá đơn.
 */
public record UpdateUtilityBillRequest(
        UtilityType type,

        @Min(value = 1, message = "Tháng phải từ 1 đến 12")
        @Max(value = 12, message = "Tháng phải từ 1 đến 12")
        Integer month,

        @Min(value = 2000, message = "Năm không hợp lệ")
        Integer year,

        @DecimalMin(value = "0.0", inclusive = false, message = "Số tiền phải lớn hơn 0")
        BigDecimal amount
) {}
