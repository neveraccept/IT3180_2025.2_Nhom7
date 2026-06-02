package org.example.backend.dto.request;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;


//PUT /api/apartments/{id}/household.

public record UpdateHouseholdRequest(

        @NotNull(message = "Phải chỉ định action: UPDATE hoặc MOVE_OUT")
        Action action,

        // ----- Chỉ sử dụng khi action = UPDATE -----
        @Size(max = 20)
        String code,

        LocalDate moveInDate,

        // Đổi chủ hộ: id phải thuộc cùng household và đang ACTIVE.
        Long headResidentId
) {
    public enum Action {
        UPDATE,
        MOVE_OUT
    }
}

