package org.example.backend.dto;

import org.example.backend.entity.PaymentTransaction;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/** KHÔNG bao giờ chứa vnp_SecureHash (SDD: bảng không lưu chữ ký). */
public record PaymentTransactionDTO(
        Long id,
        String transactionCode,
        Long householdId,
        String householdCode,
        Long userId,
        String targetType,
        Long targetId,
        String targetIds,
        String targetAmounts,
        String utilityBillIds,
        BigDecimal amount,
        String status,
        String vnpayTransactionNo,
        String vnpayResponseCode,
        String vnpayBankCode,
        String vnpayPayDate,
        String paymentUrl,
        LocalDateTime paidAt,
        LocalDateTime createdAt
) {
    public static PaymentTransactionDTO from(PaymentTransaction t) {
        return new PaymentTransactionDTO(
                t.getId(),
                t.getTransactionCode(),
                t.getHousehold() != null ? t.getHousehold().getId() : null,
                t.getHousehold() != null ? t.getHousehold().getCode() : null,
                t.getUser() != null ? t.getUser().getId() : null,
                t.getTargetType(),
                t.getTargetId(),
                t.getTargetIds(),
                t.getTargetAmounts(),
                t.getUtilityBillIds(),
                t.getAmount(),
                t.getStatus(),
                t.getVnpayTransactionNo(),
                t.getVnpayResponseCode(),
                t.getVnpayBankCode(),
                t.getVnpayPayDate(),
                t.getPaymentUrl(),
                t.getPaidAt(),
                t.getCreatedAt()
        );
    }
}
