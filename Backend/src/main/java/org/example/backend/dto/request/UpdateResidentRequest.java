package org.example.backend.dto.request;

import jakarta.validation.constraints.*;
import org.example.backend.entity.enums.Gender;

import java.time.LocalDate;

public record UpdateResidentRequest(

        @NotBlank(message = "Họ tên không được để trống")
        @Size(max = 100)
        String fullName,

        @NotBlank(message = "CCCD/CMND không được để trống")
        @Pattern(regexp = "^[0-9]{9}|[0-9]{12}$", message = "CCCD/CMND phải là 9 hoặc 12 chữ số")
        String idCard,

        @NotNull
        @Past
        LocalDate dateOfBirth,

        @NotNull(message = "Giới tính không được để trống")
        Gender gender,

        @NotBlank
        @Size(max = 30)
        String relationToHead
) {}