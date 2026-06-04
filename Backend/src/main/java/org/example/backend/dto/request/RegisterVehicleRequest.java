package org.example.backend.dto.request;

import org.example.backend.entity.enums.VehicleType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/** F6.1 – Đăng ký một xe cho hộ. */
public record RegisterVehicleRequest(
        @NotNull(message = "householdId không được để trống")
        Long householdId,

        @NotBlank(message = "Biển số không được để trống")
        @Size(max = 20, message = "Biển số tối đa 20 ký tự")
        String licensePlate,

        @NotNull(message = "Loại xe không được để trống")
        VehicleType type
) {}
