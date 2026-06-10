
package org.example.backend.dto.request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import org.example.backend.entity.enums.Gender;
import org.example.backend.entity.enums.ResidencyStatus;

import java.time.LocalDate;

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
    String role,

    // ====== Thông tin nhân khẩu (chỉ dùng khi tạo tài khoản role RESIDENT có gắn căn hộ) ======
    // Để mỗi tài khoản cư dân luôn ứng với một nhân khẩu thật trong hộ (xem ApproveAccountRequest).
    Long linkResidentId,
    String idCard,
    LocalDate dateOfBirth,
    Gender gender,
    String relationToHead,
    ResidencyStatus residencyStatus,
    String newHouseholdCode,
    LocalDate moveInDate
) {
    /** Gom các trường nhân khẩu thành payload dùng chung với luồng duyệt tài khoản. */
    public ApproveAccountRequest toResidentLink() {
        return new ApproveAccountRequest(
                linkResidentId, idCard, dateOfBirth, gender,
                relationToHead, residencyStatus, newHouseholdCode, moveInDate);
    }
}
