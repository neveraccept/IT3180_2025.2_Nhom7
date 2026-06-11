package org.example.backend.dto;

import org.example.backend.entity.enums.PaymentMethod;
import org.example.backend.entity.enums.UtilityBillStatus;
import org.example.backend.entity.enums.UtilityType;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

public record UtilityBillDTO(
        Long id,
        Long householdId,
        String householdCode,
        UtilityType type,
        Integer month,
        Integer year,
        Integer oldIndex,
        Integer newIndex,
        BigDecimal amount,
        UtilityBillStatus status,
        LocalDate paidDate,
        PaymentMethod paymentMethod,
        String transactionCode,
        LocalDateTime paidAt
) {}
