package org.example.backend.dto;

/**
 * Kết quả sau khi cấp tài khoản cho cư dân.
 * temporaryPassword là mật khẩu sinh tự động, CHỈ trả về 1 lần để Admin bàn giao cho cư dân
 * (không bao giờ lưu/đọc lại dạng plaintext sau này).
 */
public record AccountCreatedDTO(
        Long userId,
        String username,
        String temporaryPassword,
        String role,
        Long residentId,
        String residentName
) {
}
