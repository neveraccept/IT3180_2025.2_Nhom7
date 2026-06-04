package org.example.backend.service.mapper;

import org.example.backend.dto.ParkingRegistrationDTO;
import org.example.backend.dto.ParkingSlotDTO;
import org.example.backend.entity.ParkingRegistration;
import org.example.backend.entity.ParkingSlot;
import org.example.backend.entity.Vehicle;
import org.springframework.stereotype.Component;

/** Ánh xạ ParkingSlot / ParkingRegistration Entity → DTO. */
@Component
public class ParkingMapper {

    public ParkingSlotDTO toSlotDto(ParkingSlot s) {
        return new ParkingSlotDTO(s.getId(), s.getCode(), s.getType(), s.getStatus());
    }

    public ParkingRegistrationDTO toRegistrationDto(ParkingRegistration r) {
        Vehicle v = r.getVehicle();
        return new ParkingRegistrationDTO(
                r.getId(),
                r.getSlot() != null ? r.getSlot().getId() : null,
                r.getSlot() != null ? r.getSlot().getCode() : null,
                v != null ? v.getId() : null,
                v != null ? v.getLicensePlate() : null,
                r.getRenterName(),
                r.getRenterPhone(),
                r.getStartDate(),
                r.getEndDate(),
                r.getMonthlyFee(),
                r.getStatus()
        );
    }
}
