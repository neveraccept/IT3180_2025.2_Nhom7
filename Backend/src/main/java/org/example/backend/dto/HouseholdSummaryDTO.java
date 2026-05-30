package org.example.backend.dto;

import java.time.LocalDate;
import java.util.List;

public record HouseholdSummaryDTO(
        Long id,
        String code,
        Long apartmentId,
        String apartmentCode,
        LocalDate moveInDate,
        String status,
        ResidentSummaryDTO headOfHousehold,
        List<ResidentSummaryDTO> residents
) {
}

