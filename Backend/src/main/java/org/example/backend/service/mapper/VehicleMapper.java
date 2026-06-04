package org.example.backend.service.mapper;

import org.example.backend.dto.VehicleDTO;
import org.example.backend.entity.Vehicle;
import org.springframework.stereotype.Component;

/** Ánh xạ Vehicle Entity → DTO. */
@Component
public class VehicleMapper {

    public VehicleDTO toDto(Vehicle v) {
        return new VehicleDTO(
                v.getId(),
                v.getHousehold() != null ? v.getHousehold().getId() : null,
                v.getHousehold() != null ? v.getHousehold().getCode() : null,
                v.getLicensePlate(),
                v.getType(),
                v.getRegisteredDate(),
                Boolean.TRUE.equals(v.getActive())
        );
    }
}
