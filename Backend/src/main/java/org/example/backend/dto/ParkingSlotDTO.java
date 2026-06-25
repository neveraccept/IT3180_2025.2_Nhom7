package org.example.backend.dto;

import org.example.backend.entity.enums.ParkingSlotStatus;
import org.example.backend.entity.enums.VehicleType;

/**
 * DTO trả về cho frontend khi liệt kê chỗ gửi xe.
 * licensePlate  — biển số xe đang gán vào chỗ này (null nếu EMPTY hoặc RENTED cho thuê ngoài).
 * householdCode — mã hộ khẩu sở hữu xe đó        (null nếu EMPTY hoặc RENTED cho thuê ngoài).
 * apartmentCode — mã căn hộ của hộ sở hữu xe đó  (null nếu EMPTY hoặc RENTED cho thuê ngoài).
 */
public record ParkingSlotDTO(
        Long id,
        String code,
        VehicleType type,
        ParkingSlotStatus status,
        Long activeRegistrationId,
        String licensePlate,
        String householdCode,
        String apartmentCode
) {}
