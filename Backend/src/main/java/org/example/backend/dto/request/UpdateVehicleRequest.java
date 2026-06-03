package org.example.backend.dto.request;

import org.example.backend.entity.enums.VehicleType;
import jakarta.validation.constraints.Size;

/**
 * F6.2 – Cập nhật thông tin xe. Các trường null = giữ nguyên.
 * Không cho đổi hộ sở hữu xe ở phiên bản này.
 */
public record UpdateVehicleRequest(
    @Size(max = 20, message = "Biển số tối đa 20 ký tự")
    String licensePlate,

    VehicleType type,

    Boolean active
) {
}
