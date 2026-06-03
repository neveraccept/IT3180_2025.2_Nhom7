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
        // Xác định là khách ngoài nếu không có vehicle
        boolean isExternalRenter = (v == null);

        // Lấy biển số: Nếu cư dân thì lấy của vehicle, nếu khách thì lấy renterLicensePlate
        String licensePlate = (v != null) ? v.getLicensePlate() : r.getRenterLicensePlate();
        return new ParkingRegistrationDTO(
                r.getId(),
                r.getSlot() != null ? r.getSlot().getId() : null,
                r.getSlot() != null ? r.getSlot().getCode() : null,
                isExternalRenter,                   // boolean isExternalRenter
                licensePlate,                       // String licensePlate
                v != null ? v.getId() : null,       // Long vehicleId
                r.getRenterName(),                  // String renterName
                r.getRenterPhone(),                 // String renterPhone
                r.getStartDate(),                   // LocalDate startDate
                r.getEndDate(),                     // LocalDate endDate
                r.getMonthlyFee(),                  // BigDecimal monthlyFee
                r.getStatus()                       // ParkingRegistrationStatus status
        );
    }
}
