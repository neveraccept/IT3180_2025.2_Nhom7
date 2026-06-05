package org.example.backend.dto.request;

import org.example.backend.entity.enums.UtilityType;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;

/** F7.1 – Nhập hoá đơn điện/nước/internet theo hộ và theo tháng. */
public record CreateUtilityBillRequest(
        @NotNull(message = "householdId không được để trống")
        Long householdId,

        @NotNull(message = "Loại hoá đơn không được để trống")
        UtilityType type,

        @NotNull(message = "Tháng không được để trống")
        @Min(value = 1, message = "Tháng phải từ 1 đến 12")
        @Max(value = 12, message = "Tháng phải từ 1 đến 12")
        Integer month,

        @NotNull(message = "Năm không được để trống")
        @Min(value = 2000, message = "Năm không hợp lệ")
        Integer year,

        @NotNull(message = "Số tiền không được để trống")
        @DecimalMin(value = "0.0", inclusive = false, message = "Số tiền phải lớn hơn 0")
        BigDecimal amount
) {}
