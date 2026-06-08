package org.example.backend.dto.request;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;

/**
 * Action 1 – Bàn giao nhà (Move-in): POST /api/households/move-in
 * Gom toàn bộ thao tác "đưa một hộ mới vào căn hộ trống" thành 1 lời gọi:
 * tạo chủ hộ (Resident) -> tạo Household gắn căn hộ -> đổi căn hộ sang OCCUPIED
 * -> (nếu createAccount) sinh tài khoản đăng nhập cho chủ hộ.
 *
 * Tái sử dụng HeadOfHouseholdInput của {@link AssignHouseholdRequest} để chỉ có 1 nguồn định nghĩa chủ hộ.
 */
public record MoveInRequest(

        @NotBlank(message = "Mã căn hộ không được để trống")
        @Size(max = 20, message = "Mã căn hộ tối đa 20 ký tự")
        String apartmentCode,

        @NotBlank(message = "Mã hộ khẩu không được để trống")
        @Size(max = 20, message = "Mã hộ khẩu tối đa 20 ký tự")
        String householdCode,

        @NotNull(message = "Ngày chuyển đến không được để trống")
        LocalDate moveInDate,

        @NotNull(message = "Thông tin chủ hộ không được để trống")
        @Valid
        AssignHouseholdRequest.HeadOfHouseholdInput headOfHousehold,

        /** true = tạo luôn tài khoản đăng nhập cho chủ hộ ngay khi bàn giao. */
        boolean createAccount
) {
}
