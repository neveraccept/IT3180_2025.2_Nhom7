package org.example.backend.dto;

import java.time.LocalDate;

public record ResidentSummaryDTO(
        Long id,
        String fullName,
        String idCard,
        LocalDate dateOfBirth,
        String gender,
        String relationToHead,
        String residencyStatus,
        String status
) {
}
