package org.example.backend.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;
import java.time.LocalDate;

@Data
public class FeePeriodDTO {
    private Long id;

    @NotNull(message = "Phải chọn khoản thu (feeId)")
    private Long feeId;

    @NotBlank(message = "Tên đợt thu không được để trống")
    private String name;

    @NotNull(message = "Ngày bắt đầu không được để trống")
    private LocalDate startDate;

    @NotNull(message = "Ngày kết thúc không được để trống")
    private LocalDate endDate;

    private String status; // OPEN, CLOSED

    // Kiểm tra ngày bắt đầu phải <= ngày kết thúc (Bean Validation gọi method @AssertTrue)
    @jakarta.validation.constraints.AssertTrue(message = "Ngày bắt đầu phải nhỏ hơn hoặc bằng ngày kết thúc")
    public boolean isValidDateRange() {
        // Bỏ qua nếu một trong hai null (đã có @NotNull báo lỗi riêng)
        if (startDate == null || endDate == null) {
            return true;
        }
        return !startDate.isAfter(endDate);
    }
}
