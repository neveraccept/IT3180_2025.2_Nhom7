package org.example.backend.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.*;

@Data
public class OtpRequest {

    @NotBlank(message = "Email không được để trống")
    @Email(message = "Email không đúng định dạng")
    private String email;

    @NotBlank(message = "Mục đích (purpose) không được để trống")
    private String purpose;
    // Giá trị hợp lệ thường là: "REGISTER" hoặc "FORGOT_PASSWORD"
}