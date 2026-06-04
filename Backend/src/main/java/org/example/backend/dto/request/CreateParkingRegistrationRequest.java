package org.example.backend.dto.request;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.time.LocalDate;

/**
 * F6.1 (gán chỗ cho xe hộ) + F6.5 (cho người ngoài thuê chỗ thừa).
 * Hai chế độ loại trừ nhau, do Service kiểm tra:
 *   - Gán xe hộ : truyền `vehicleId`, bỏ trống renter*. Phí mặc định theo loại xe.
 *   - Cho thuê  : bỏ trống `vehicleId`, truyền `renterName` (+ `renterPhone`) và `monthlyFee`.
 */
public record CreateParkingRegistrationRequest(
        @NotNull(message = "slotId không được để trống")
        Long slotId,

        Long vehicleId,

        @Size(max = 100, message = "Tên người thuê tối đa 100 ký tự")
        String renterName,

        @Size(max = 20, message = "SĐT người thuê tối đa 20 ký tự")
        String renterPhone,

        LocalDate startDate,

        LocalDate endDate,

        /** Bắt buộc khi cho thuê; với xe hộ nếu null sẽ lấy phí mặc định theo loại xe. */
        BigDecimal monthlyFee
) {}
