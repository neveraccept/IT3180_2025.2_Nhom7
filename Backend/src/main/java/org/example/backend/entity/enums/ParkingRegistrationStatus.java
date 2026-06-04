package org.example.backend.entity.enums;

/**
 * Trạng thái một lượt đăng ký/cho thuê chỗ gửi xe.
 *   ACTIVE – đang hiệu lực (đang chiếm chỗ).
 *   ENDED  – đã kết thúc (huỷ đăng ký / hết hạn thuê), chỗ được giải phóng.
 */
public enum ParkingRegistrationStatus {
    ACTIVE,
    ENDED
}
