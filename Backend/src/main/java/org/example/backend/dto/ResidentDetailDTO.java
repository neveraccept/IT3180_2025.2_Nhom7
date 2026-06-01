package org.example.backend.dto;

import org.example.backend.entity.enums.Gender;
import org.example.backend.entity.enums.ResidencyStatus;
import org.example.backend.entity.enums.ResidentStatus;

import java.time.LocalDate;

public record ResidentDetailDTO(
        Long id,
        String fullName,
        String idCard,
        LocalDate dateOfBirth,
        Gender gender,
        String relationToHead,
        ResidencyStatus residencyStatus,
        ResidentStatus status,
        Long householdId,
        String householdCode,
        String apartmentCode
) {}