package org.example.backend.dto;

import lombok.*;

@Setter
@Getter
public class LoginResponse {

    private String accessToken;
    private String tokenType = "Bearer";
    private Long userId;
    private String role;
    private Long householdId; // Có thể null đối với Admin hoặc Cư dân chưa được duyệt

    // Constructor mặc định
    public LoginResponse() {
    }

    // Constructor đầy đủ tham số (thường dùng khi khởi tạo trả về từ AuthService)
    public LoginResponse(String accessToken, Long userId, String role, Long householdId) {
        this.accessToken = accessToken;
        this.userId = userId;
        this.role = role;
        this.householdId = householdId;
    }
}