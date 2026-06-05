package org.example.backend.entity.enums;

/**
 * Trạng thái chỗ gửi xe trong bãi.
 *   EMPTY  – còn trống, có thể gán xe của hộ hoặc cho thuê.
 *   USED   – đang gán cho một xe thuộc hộ dân.
 *   RENTED – đang cho người ngoài hộ thuê.
 */
public enum ParkingSlotStatus {
    EMPTY,
    USED,
    RENTED
}
