package org.example.backend.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.*;

@Data
public class CreateUserRequest {
    @NotBlank(message = "Username không được để trống")
    private String username;

    @NotBlank(message = "Mật khẩu không được để trống")
    private String password; // ĐÂY! Chữ "password" thường mà bạn muốn đây!
    private String confirmPassword; // Thêm trường xác nhận mật khẩu
    private String fullName;
    private String email;
    private String phone;
    private String role; // Chỉ cần gửi tên role dạng chuỗi, VD: "ADMIN"
    private String requested_apartment_code;
}