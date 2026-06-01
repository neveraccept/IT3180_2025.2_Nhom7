package org.example.backend.dto.request;

import org.example.backend.entity.enums.ApartmentStatus;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;


 // PUT /api/apartments/{id} (F2.4 – Chỉnh sửa thông tin căn hộ).

public record ApartmentUpdateRequest(

        @Min(value = 1, message = "Tầng phải >= 1")
        Integer floor,

        @DecimalMin(value = "0.01", message = "Diện tích phải > 0")
        @Digits(integer = 8, fraction = 2, message = "Diện tích không hợp lệ")
        BigDecimal area,

        ApartmentStatus status,

        @Size(max = 1000, message = "Ghi chú tối đa 1000 ký tự")
        String note
) {
}

