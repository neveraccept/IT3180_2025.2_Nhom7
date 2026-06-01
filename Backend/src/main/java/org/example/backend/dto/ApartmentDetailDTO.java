package org.example.backend.dto;

import java.math.BigDecimal;

public record ApartmentDetailDTO(
        Long id,
        String code,
        Integer floor,
        BigDecimal area,
        String status,
        String note,
        HouseholdSummaryDTO currentHousehold
) {
}

