package org.example.backend.dto;

import org.example.backend.entity.enums.VehicleType;

import java.time.LocalDate;

/** Dữ liệu xe trả về cho frontend (không lộ Entity JPA). */
public record VehicleDTO(
        Long id,
        Long householdId,
        String householdCode,
        String licensePlate,
        VehicleType type,
        LocalDate registeredDate,
        boolean active
) {}
