package org.example.backend.dto.request;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;
import java.util.List;


//PUT /api/apartments/{id}/household.

public record UpdateHouseholdRequest(

        @NotNull(message = "Phải chỉ định action: UPDATE hoặc MOVE_OUT")
        Action action,

        // ----- Chỉ sử dụng khi action = UPDATE -----
        @Size(max = 20)
        String code,

        LocalDate moveInDate,

        // Đổi chủ hộ: id phải thuộc cùng household và đang ACTIVE.
        Long headResidentId,

        @Valid
        List<MemberRelationUpdate> memberRelations
) {
    public enum Action {
        UPDATE,
        MOVE_OUT
    }

    public record MemberRelationUpdate(
            @NotNull(message = "residentId không được để trống")
            Long residentId,

            @Size(max = 30)
            String relationToHead
    ) {
    }
}

