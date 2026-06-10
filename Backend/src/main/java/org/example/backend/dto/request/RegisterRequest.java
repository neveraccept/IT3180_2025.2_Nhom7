package org.example.backend.dto.request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record RegisterRequest(
    @NotBlank(message = "Username không được để trống")
    @Size(min = 3, max = 50, message = "Username phải từ 3 đến 50 ký tự")
    @Pattern(regexp = "^[a-zA-Z0-9._-]+$", message = "Username chỉ gồm chữ, số và các ký tự . _ -")
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

    @Pattern(regexp = "^(0\\d{9,10})?$", message = "Số điện thoại phải gồm 10-11 chữ số và bắt đầu bằng 0")
    String phone,

    @NotBlank(message = "Vui lòng chọn căn hộ")
    String requestedApartmentCode
) {
}