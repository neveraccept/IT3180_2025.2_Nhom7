package org.example.backend.dto.request;

import jakarta.validation.constraints.NotBlank;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

/** Body for POST /api/payments/vnpay/create-url. */
public record VnpayPaymentUrlRequest(
        @NotBlank(message = "targetType is required")
        String targetType,

        Long targetId,

        BigDecimal customAmount,

        List<Long> targetIds,

        List<Long> utilityBillIds,

        Map<Long, BigDecimal> customAmounts
) {}
