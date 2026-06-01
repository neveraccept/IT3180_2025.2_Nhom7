package org.example.backend.dto;

import org.example.backend.entity.enums.ComplaintCategory;
import org.example.backend.entity.enums.ComplaintStatus;

import java.time.LocalDateTime;

public record ComplaintDTO(
        Long id,
        String title,
        ComplaintCategory category,
        String content,
        ComplaintStatus status,
        String response,
        String senderName,
        String householdCode,
        String handledByName,
        LocalDateTime createdAt,
        LocalDateTime respondedAt
) {
}