package org.example.backend.dto;

public record LoginResponseDTO(
    String accessToken,
    String tokenType,
    Long userId,
    String role,
    Long householdId // Có thể null đối với Admin hoặc Cư dân chưa được duyệt
) {
    // Constructor đầy đủ tham số (thường dùng khi khởi tạo trả về từ AuthService)
    public LoginResponseDTO(String accessToken, Long userId, String role, Long householdId) {
        this(accessToken, "Bearer", userId, role, householdId);
    }
}