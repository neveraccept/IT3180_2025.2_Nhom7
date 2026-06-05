package org.example.backend.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

/** Body cho POST /api/payments/vnpay/create-url */
public record VnpayPaymentUrlRequest(
        @NotBlank(message = "targetType không được để trống")
        String targetType,          // FEE_PAYMENT | UTILITY_BILL

        @NotNull(message = "targetId không được để trống")
        Long targetId
) {}