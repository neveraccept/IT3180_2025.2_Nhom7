package org.example.backend.config;

import lombok.Getter;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Component
@Getter
public class VnpayConfig {

    @Value("${vnpay.tmn-code}")
    private String tmnCode;

    @Value("${vnpay.hash-secret}")
    private String hashSecret;

    @Value("${vnpay.pay-url:https://sandbox.vnpayment.vn/paymentv2/vpcpay.html}")
    private String payUrl;

    /** Return URL trỏ về BACKEND (GET /api/payments/vnpay/return). */
    @Value("${vnpay.return-url}")
    private String returnUrl;

    /** Trang kết quả của FRONTEND để redirect cư dân sau khi xử lý xong. */
    @Value("${vnpay.frontend-return-url}")
    private String frontendReturnUrl;

    @Value("${vnpay.version:2.1.0}")
    private String version;

    @Value("${vnpay.command:pay}")
    private String command;

    @Value("${vnpay.curr-code:VND}")
    private String currCode;

    @Value("${vnpay.locale:vn}")
    private String locale;

    @Value("${vnpay.order-type:other}")
    private String orderType;
}

