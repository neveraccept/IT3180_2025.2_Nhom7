package org.example.backend.dto.request;

import jakarta.validation.constraints.*;
import org.example.backend.entity.enums.Gender;
import org.example.backend.entity.enums.ResidencyStatus;

import java.time.LocalDate;

public record CreateResidentRequest(

        @NotNull(message = "householdId không được để trống")
        Long householdId,

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

        /** Tuỳ chọn; mặc định PERMANENT nếu null/blank. */
        ResidencyStatus residencyStatus
) {}