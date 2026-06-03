package org.example.backend.dto;

/**
 * F6.4 – Tình trạng chỗ gửi xe.
 * total = tổng số chỗ; used = đang gán xe hộ; rented = đang cho thuê; empty = còn trống.
 */
public record ParkingSummaryDTO(
        long total,
        long used,
        long rented,
        long empty
) {}
