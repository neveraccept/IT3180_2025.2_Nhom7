package org.example.backend.service.mapper;

import org.example.backend.dto.ResidentDetailDTO;
import org.example.backend.entity.Household;
import org.example.backend.entity.Resident;
import org.springframework.stereotype.Component;

@Component
public class ResidentMapper {

    public ResidentDetailDTO toDetail(Resident r) {
        Household h = r.getHousehold();
        return new ResidentDetailDTO(
                r.getId(),
                r.getFullName(),
                r.getIdCard(),
                r.getDateOfBirth(),
                r.getGender(),
                r.getRelationToHead(),
                r.getResidencyStatus(),
                r.getStatus(),
                h != null ? h.getId() : null,
                h != null ? h.getCode() : null,
                (h != null && h.getApartment() != null) ? h.getApartment().getCode() : null
        );
    }
}