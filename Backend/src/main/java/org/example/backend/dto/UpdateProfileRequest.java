package org.example.backend.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import lombok.*;

@Data
public class UpdateProfileRequest {

    @NotBlank(message = "Email không được để trống")
    @Email(message = "Email không đúng định dạng")
    private String email;

    @NotBlank(message = "Số điện thoại không được để trống")
    // Biểu thức chính quy (Regex) dưới đây hỗ trợ số điện thoại Việt Nam bắt đầu bằng 0 hoặc +84, theo sau là 8-9 chữ số.
    @Pattern(regexp = "^(0|\\+84)[0-9]{8,9}$", message = "Số điện thoại không đúng định dạng")
    private String phone;
}