package org.example.backend.dto.request;

import jakarta.validation.constraints.*;
import org.example.backend.entity.enums.Gender;
import org.example.backend.entity.enums.ResidencyStatus;

import java.time.LocalDate;

/**
 * Action 2 – Thêm nhân khẩu vào hộ đã có: POST /api/households/{householdId}/members
 * Giống {@link CreateResidentRequest} nhưng KHÔNG cần householdId trong body
 * vì đã lấy từ path -> đúng tinh thần "lấy hộ làm trung tâm".
 */
public record AddMemberRequest(

        @NotBlank(message = "Họ tên không được để trống")
        @Size(max = 100, message = "Họ tên tối đa 100 ký tự")
        String fullName,

        @NotBlank(message = "CCCD/CMND không được để trống")
        @Pattern(regexp = "^([0-9]{9}|[0-9]{12})$", message = "CCCD/CMND phải là 9 hoặc 12 chữ số")
        String idCard,

        @NotNull(message = "Ngày sinh không được để trống")
        @Past(message = "Ngày sinh phải là quá khứ")
        LocalDate dateOfBirth,

        @NotNull(message = "Giới tính không được để trống")
        Gender gender,

        @NotBlank(message = "Quan hệ với chủ hộ không được để trống")
        @Size(max = 30)
        String relationToHead,

        /** Tuỳ chọn; mặc định PERMANENT nếu null. */
        ResidencyStatus residencyStatus
) {
    /** Quy đổi sang CreateResidentRequest để tái dùng ResidentService.createResident. */
    public CreateResidentRequest toCreateResidentRequest(Long householdId) {
        return new CreateResidentRequest(
                householdId, fullName, idCard, dateOfBirth, gender, relationToHead, residencyStatus);
    }
}
