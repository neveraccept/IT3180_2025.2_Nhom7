package org.example.backend.dto.request;

import org.example.backend.entity.enums.UtilityType;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;

/**
 * F7.1 – Nhập hoá đơn điện/nước/internet theo hộ và theo tháng.
 *
 * Với hoá đơn ĐIỆN/NƯỚC: nhập chỉ số cũ/mới, hệ thống tự tính số tiền
 * = (newIndex - oldIndex) * đơn giá (lấy từ SystemConfig). amount để trống.
 * Với hoá đơn INTERNET: không cần chỉ số; nếu để trống amount sẽ lấy giá gói
 * internet trong SystemConfig.
 */
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

        // Không bắt buộc: INTERNET không cần chỉ số.
        @Min(value = 0, message = "Chỉ số không hợp lệ")
        Integer oldIndex,

        @Min(value = 0, message = "Chỉ số không hợp lệ")
        Integer newIndex,

        // Không bắt buộc: điện/nước tự tính; internet có thể bỏ trống để lấy giá cấu hình.
        @DecimalMin(value = "0.0", inclusive = false, message = "Số tiền phải lớn hơn 0")
        BigDecimal amount
) {}
