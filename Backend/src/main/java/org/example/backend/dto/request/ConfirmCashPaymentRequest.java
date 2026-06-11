package org.example.backend.dto.request;

import jakarta.validation.constraints.DecimalMin;

import java.math.BigDecimal;

/**
 * Body (tuỳ chọn) cho PUT /api/admin/payments/{id}/confirm-cash.
 *
 * Với khoản thu BẮT BUỘC (MANDATORY): bỏ trống, hệ thống thu đúng số tiền phải đóng.
 * Với khoản TỰ NGUYỆN (DONATION): bắt buộc nhập {@code amount} > 0 — chính là số tiền
 * hộ đóng góp bằng tiền mặt (vì khoản tự nguyện không chốt sẵn số tiền phải đóng).
 */
public record ConfirmCashPaymentRequest(
        @DecimalMin(value = "0.0", inclusive = false, message = "Số tiền phải lớn hơn 0")
        BigDecimal amount
) {}
