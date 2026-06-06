package org.example.backend.dto;

import java.time.LocalDateTime;

public record AuditLogDTO(
        Long id,
        String adminUsername,
        String action,
        String targetEntity,
        String details,
        LocalDateTime timestamp
) {
}
