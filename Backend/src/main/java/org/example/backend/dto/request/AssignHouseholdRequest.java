package org.example.backend.dto.request;

import org.example.backend.entity.enums.Gender;
import org.example.backend.entity.enums.ResidencyStatus;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Past;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;

// POST /api/apartments/{id}/household (F2.7 – Gán hộ vào căn hộ trống).

public record AssignHouseholdRequest(

        @NotBlank(message = "Mã hộ khẩu không được để trống")
        @Size(max = 20, message = "Mã hộ khẩu tối đa 20 ký tự")
        String code,

        @NotNull(message = "Ngày chuyển đến không được để trống")
        LocalDate moveInDate,

        @NotNull(message = "Thông tin chủ hộ không được để trống")
        @Valid
        HeadOfHouseholdInput headOfHousehold
) {

    public record HeadOfHouseholdInput(
            @NotBlank(message = "Họ tên chủ hộ không được để trống")
            @Size(max = 100, message = "Họ tên tối đa 100 ký tự")
            String fullName,

            @Size(max = 20, message = "CCCD/CMND tối đa 20 ký tự")
            String idCard,

            @Past(message = "Ngày sinh phải trong quá khứ")
            LocalDate dateOfBirth,

            Gender gender,

            @Size(max = 30)
            String relationToHead,

            ResidencyStatus residencyStatus
    ) {
    }
}

