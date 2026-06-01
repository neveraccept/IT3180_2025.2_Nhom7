package org.example.backend.service.mapper;

import org.example.backend.dto.ApartmentDTO;
import org.example.backend.dto.ApartmentDetailDTO;
import org.example.backend.dto.HouseholdSummaryDTO;
import org.example.backend.dto.ResidentSummaryDTO;
import org.example.backend.entity.Apartment;
import org.example.backend.entity.Household;
import org.example.backend.entity.Resident;
import org.example.backend.entity.enums.ResidentStatus;
import org.springframework.stereotype.Component;

import java.util.Comparator;
import java.util.List;
import java.util.Objects;

@Component
public class ApartmentMapper {

    /**
     * Map Apartment + Household ACTIVE (có thể null) sang DTO list.
     * Nhận sẵn `activeHousehold` thay vì re-query để tránh N+1.
     */
    public ApartmentDTO toListDto(Apartment ap, Household activeHousehold) {
        String householdCode = activeHousehold == null ? null : activeHousehold.getCode();
        String headName = null;
        if (activeHousehold != null && activeHousehold.getHeadOfHousehold() != null) {
            headName = activeHousehold.getHeadOfHousehold().getFullName();
        }
        return new ApartmentDTO(
                ap.getId(),
                ap.getCode(),
                ap.getFloor(),
                ap.getArea(),
                ap.getStatus().name(),
                ap.getNote(),
                householdCode,
                headName
        );
    }

    public ApartmentDetailDTO toDetailDto(Apartment ap, Household activeHousehold) {
        return new ApartmentDetailDTO(
                ap.getId(),
                ap.getCode(),
                ap.getFloor(),
                ap.getArea(),
                ap.getStatus().name(),
                ap.getNote(),
                activeHousehold == null ? null : toHouseholdSummary(activeHousehold)
        );
    }

    public HouseholdSummaryDTO toHouseholdSummary(Household h) {
        // Chỉ lấy nhân khẩu ACTIVE (lịch sử để M3 tra cứu)
        List<ResidentSummaryDTO> residents = h.getResidents().stream()
                .filter(r -> r.getStatus() == ResidentStatus.ACTIVE)
                .sorted(Comparator.comparing(Resident::getId))
                .map(this::toResidentSummary)
                .toList();

        ResidentSummaryDTO head = h.getHeadOfHousehold() == null
                ? null
                : toResidentSummary(h.getHeadOfHousehold());

        return new HouseholdSummaryDTO(
                h.getId(),
                h.getCode(),
                h.getApartment() == null ? null : h.getApartment().getId(),
                h.getApartment() == null ? null : h.getApartment().getCode(),
                h.getMoveInDate(),
                h.getStatus().name(),
                head,
                residents
        );
    }

    public ResidentSummaryDTO toResidentSummary(Resident r) {
        Objects.requireNonNull(r, "Resident must not be null");
        return new ResidentSummaryDTO(
                r.getId(),
                r.getFullName(),
                r.getIdCard(),
                r.getDateOfBirth(),
                r.getGender() == null ? null : r.getGender().name(),
                r.getRelationToHead(),
                r.getResidencyStatus() == null ? null : r.getResidencyStatus().name(),
                r.getStatus() == null ? null : r.getStatus().name()
        );
    }
}


