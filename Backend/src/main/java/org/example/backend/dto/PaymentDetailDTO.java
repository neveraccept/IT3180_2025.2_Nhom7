package org.example.backend.dto;

import org.example.backend.entity.Payment;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

public record PaymentDetailDTO(
        Long id,
        Long feePeriodId,
        String feePeriodName,
        String feePeriodStatus,
        String feeName,
        String feeType,
        Long householdId,
        String householdCode,
        BigDecimal amountDue,
        BigDecimal amountPaid,
        LocalDate paidDate,
        String status,
        String paymentMethod,
        String transactionCode,
        LocalDateTime paidAt,
        String note,
        String collectedByName
) {
    public static PaymentDetailDTO from(Payment p) {
        return new PaymentDetailDTO(
                p.getId(),
                p.getFeePeriod() != null ? p.getFeePeriod().getId() : null,
                p.getFeePeriod() != null ? p.getFeePeriod().getName() : null,
                p.getFeePeriod() != null ? p.getFeePeriod().getStatus() : null,
                p.getFeePeriod() != null && p.getFeePeriod().getFee() != null
                        ? p.getFeePeriod().getFee().getName() : null,
                p.getFeePeriod() != null && p.getFeePeriod().getFee() != null
                        ? p.getFeePeriod().getFee().getType() : null,
                p.getHousehold() != null ? p.getHousehold().getId() : null,
                p.getHousehold() != null ? p.getHousehold().getCode() : null,
                p.getAmountDue(),
                p.getAmountPaid(),
                p.getPaidDate(),
                p.getStatus(),
                p.getPaymentMethod(),
                p.getTransactionCode(),
                p.getPaidAt(),
                p.getNote(),
                p.getCollectedBy() != null ? p.getCollectedBy().getFullName() : null
        );
    }
}

