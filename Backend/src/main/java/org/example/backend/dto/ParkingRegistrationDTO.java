package org.example.backend.dto;

import org.example.backend.entity.enums.ParkingRegistrationStatus;

import java.math.BigDecimal;
import java.time.LocalDate;

public record ParkingRegistrationDTO(
        Long id,
        Long slotId,
        String slotCode,
        Long vehicleId,
        String licensePlate,
        String renterName,
        String renterPhone,
        LocalDate startDate,
        LocalDate endDate,
        BigDecimal monthlyFee,
        ParkingRegistrationStatus status
) {}
