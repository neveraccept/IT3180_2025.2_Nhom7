package org.example.backend.dto;

public record ParkingSummaryDTO(
    long total,
    long used,
    long rented,
    long empty
) {
}
