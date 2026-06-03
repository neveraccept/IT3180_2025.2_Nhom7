package org.example.backend.dto.request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

public record OtpRequest(
        @NotBlank(message = "Email không được để trống")
        @Email(message = "Email không đúng định dạng")
        String email

//        @NotBlank(message = "Mục đích (purpose) không được để trống")
//        String purpose
        // Giá trị hợp lệ thường là: "REGISTER" hoặc "FORGOT_PASSWORD"
) {
}