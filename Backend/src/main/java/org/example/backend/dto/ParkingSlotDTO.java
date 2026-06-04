package org.example.backend.dto;

import org.example.backend.entity.enums.ParkingSlotStatus;
import org.example.backend.entity.enums.VehicleType;

public record ParkingSlotDTO(
        Long id,
        String code,
        VehicleType type,
        ParkingSlotStatus status
) {}
