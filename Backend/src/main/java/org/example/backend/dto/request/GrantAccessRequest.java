package org.example.backend.dto.request;

import jakarta.validation.constraints.NotNull;

/**
 * Action 3 – Cấp tài khoản cho cư dân: POST /api/users/grant-access
 * Tạo tài khoản đăng nhập (role RESIDENT) liên kết với một nhân khẩu sẵn có.
 */
public record GrantAccessRequest(
        @NotNull(message = "residentId không được để trống")
        Long residentId
) {
}
