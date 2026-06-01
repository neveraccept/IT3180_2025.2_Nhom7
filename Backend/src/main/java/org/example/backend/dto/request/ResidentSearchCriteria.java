package org.example.backend.dto.request;

import org.example.backend.entity.enums.ResidencyStatus;
import org.example.backend.entity.enums.ResidentStatus;

public record ResidentSearchCriteria(
        String name,
        String idCard,
        ResidencyStatus residencyStatus,   // PERMANENT / TEMPORARY
        Long householdId,
        ResidentStatus status             // ACTIVE / MOVED_OUT
) {}