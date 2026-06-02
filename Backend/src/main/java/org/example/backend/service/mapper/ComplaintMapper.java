package org.example.backend.service.mapper;

import org.example.backend.dto.ComplaintDTO;
import org.example.backend.entity.Complaint;
import org.springframework.stereotype.Component;

@Component
public class ComplaintMapper {

    public ComplaintDTO toDto(Complaint c) {
        return new ComplaintDTO(
                c.getId(),
                c.getTitle(),
                c.getCategory(),
                c.getContent(),
                c.getStatus(),
                c.getResponse(),
                c.getSender() != null ? c.getSender().getFullName() : null,
                c.getHousehold() != null ? c.getHousehold().getCode() : null,
                c.getHandledBy() != null ? c.getHandledBy().getFullName() : null,
                c.getCreatedAt(),
                c.getRespondedAt()
        );
    }
}