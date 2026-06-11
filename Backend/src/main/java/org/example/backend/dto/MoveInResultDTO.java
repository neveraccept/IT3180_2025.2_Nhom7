package org.example.backend.dto;

/**
 * Kết quả của thao tác bàn giao nhà (move-in):
 * - household: snapshot hộ vừa tạo (kèm chủ hộ) để FE refresh ngay.
 * - account: thông tin tài khoản vừa cấp cho chủ hộ (null nếu createAccount = false).
 */
public record MoveInResultDTO(
        HouseholdSummaryDTO household,
        AccountCreatedDTO account
) {
}
