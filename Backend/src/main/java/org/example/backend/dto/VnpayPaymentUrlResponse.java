package org.example.backend.dto;

public record VnpayPaymentUrlResponse(
        String paymentUrl,
        String transactionCode
) {}