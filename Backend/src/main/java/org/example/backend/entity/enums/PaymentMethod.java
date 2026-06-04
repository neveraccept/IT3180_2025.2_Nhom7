package org.example.backend.entity.enums;

/**
 * Phương thức thanh toán hoá đơn.
 *   CASH   – Admin xác nhận đã nộp tiền mặt (F7.3).
 *   ONLINE – Thanh toán qua VNPay Sandbox (module thanh toán xử lý).
 *
 * LƯU Ý: Nếu codebase đã có sẵn enum PaymentMethod (dùng cho module Payment/VNPay),
 * hãy XOÁ file này và import enum sẵn có để tránh trùng lớp.
 */
public enum PaymentMethod {
    CASH,
    ONLINE
}
