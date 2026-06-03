
package org.example.backend.dto.request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record AdminRegisterRequest(
    @NotBlank(message = "Username không được để trống")
    String username,

    @NotBlank(message = "Mật khẩu không được để trống")
    @Size(min = 8, message = "Mật khẩu phải có tối thiểu 8 ký tự")
    String password,

    @NotBlank(message = "Xác nhận mật khẩu không được để trống")
    String confirmPassword,

    @NotBlank(message = "Họ tên không được để trống")
    String fullName,

    @NotBlank(message = "Email không được để trống")
    @Email(message = "Email không đúng định dạng")
    String email,

    String phone,

    String requestedApartmentCode,

    @NotBlank(message = "Role không được để trống")
    String role // Chỉ cần gửi tên role dạng chuỗi, VD: "ADMIN"
) {
}