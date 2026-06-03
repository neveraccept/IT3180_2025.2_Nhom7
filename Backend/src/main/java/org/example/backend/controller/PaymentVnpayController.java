package org.example.backend.controller;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.example.backend.dto.response.ApiResponse;
import org.example.backend.dto.response.PageResponse;
import org.example.backend.dto.PaymentTransactionDTO;
import org.example.backend.dto.request.VnpayPaymentUrlRequest;
import org.example.backend.dto.VnpayPaymentUrlResponse;
import org.example.backend.config.VnpayConfig;
import org.example.backend.entity.Household;
import org.example.backend.exception.BadRequestException;
import org.example.backend.service.VnpayService;
import org.example.backend.security.CurrentUserService;
import org.example.backend.security.CustomUserDetails;
import org.example.backend.service.PaymentService;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.util.UriComponentsBuilder;

import java.net.URI;
import java.time.LocalDate;
import java.util.Map;

@RestController
public class PaymentVnpayController {

    private final PaymentService paymentService;
    private final VnpayService vnpayService;
    private final VnpayConfig vnpayConfig;
    private final CurrentUserService currentUserService;

    public PaymentVnpayController(PaymentService paymentService,
                                  VnpayService vnpayService,
                                  VnpayConfig vnpayConfig,
                                  CurrentUserService currentUserService) {
        this.paymentService = paymentService;
        this.vnpayService = vnpayService;
        this.vnpayConfig = vnpayConfig;
        this.currentUserService = currentUserService;
    }

    //  RESIDENT – Tạo giao dịch + URL thanh toán VNPay
    //  POST /api/payments/vnpay/create-url
    @PostMapping("/api/payments/vnpay/create-url")
    @PreAuthorize("hasRole('RESIDENT')")
    public ResponseEntity<ApiResponse<VnpayPaymentUrlResponse>> createUrl(
            @AuthenticationPrincipal CustomUserDetails me,
            @Valid @RequestBody VnpayPaymentUrlRequest req,
            HttpServletRequest http) {
        VnpayPaymentUrlResponse res = paymentService.createVnpayTransaction(
                me.getUser().getId(), currentHouseholdId(), req, clientIp(http));
        return ResponseEntity.ok(ApiResponse.ok(res, "Tạo URL thanh toán VNPay thành công"));
    }

    //  PUBLIC (security permitAll) – Webhook IPN từ VNPay (server-to-server).
    //  Nguồn cập nhật trạng thái CHÍNH. Trả JSON theo đúng chuẩn VNPay (KHÔNG bọc ApiResponse).
    //  GET /api/payments/vnpay/ipn
    @GetMapping("/api/payments/vnpay/ipn")
    public ResponseEntity<Map<String, String>> ipn(@RequestParam Map<String, String> params) {
        PaymentService.IpnResponse r = paymentService.processVnpayIpn(params);
        return ResponseEntity.ok(Map.of("RspCode", r.rspCode(), "Message", r.message()));
    }

    //  PUBLIC (security permitAll) – Return URL: chỉ verify + đọc trạng thái rồi redirect FE.
    //  KHÔNG coi đây là nguồn cập nhật chính.
    //  GET /api/payments/vnpay/return
    @GetMapping("/api/payments/vnpay/return")
    public ResponseEntity<Void> vnpayReturn(@RequestParam Map<String, String> params) {
        String code = params.get("vnp_TxnRef");
        String status = vnpayService.verifySignature(params)
                ? paymentService.getTransactionStatusByCode(code)
                : "INVALID";

        String redirect = UriComponentsBuilder
                .fromUriString(vnpayConfig.getFrontendReturnUrl())
                .queryParam("transactionCode", code == null ? "" : code)
                .queryParam("status", status)
                .build()
                .encode()
                .toUriString();

        return ResponseEntity.status(HttpStatus.FOUND).location(URI.create(redirect)).build();
    }

    //  RESIDENT – Lịch sử giao dịch online của hộ mình
    //  GET /api/payments/vnpay/my-history
    @GetMapping("/api/payments/vnpay/my-history")
    @PreAuthorize("hasRole('RESIDENT')")
    public ResponseEntity<ApiResponse<PageResponse<PaymentTransactionDTO>>> myHistory(
            @PageableDefault(size = 20, sort = "createdAt", direction = Sort.Direction.DESC)
            Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.ok(
                paymentService.listMyTransactions(currentHouseholdId(), pageable)));
    }

    /**
     * Lấy householdId của cư dân đang đăng nhập từ DB (User trong JWT là bản "ảo", không có household).
     * Ném 400 nếu tài khoản chưa được gán vào hộ dân.
     */
    private Long currentHouseholdId() {
        Household h = currentUserService.getCurrentUser().getHousehold();
        if (h == null) {
            throw new BadRequestException("RESIDENT_NO_HOUSEHOLD",
                    "Tài khoản chưa được gán vào hộ dân nào");
        }
        return h.getId();
    }

    //  ADMIN – Tra cứu toàn bộ giao dịch online
    //  GET /api/admin/payment-transactions?status=&householdId=&targetType=&fromDate=&toDate=
    @GetMapping("/api/admin/payment-transactions")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<PageResponse<PaymentTransactionDTO>>> search(
            @RequestParam(required = false) String status,
            @RequestParam(required = false) Long householdId,
            @RequestParam(required = false) String targetType,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fromDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate toDate,
            @PageableDefault(size = 20, sort = "createdAt", direction = Sort.Direction.DESC)
            Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.ok(paymentService.searchTransactions(
                status, householdId, targetType, fromDate, toDate, pageable)));
    }

    //  ADMIN – Chi tiết một giao dịch online
    //  GET /api/admin/payment-transactions/{id}
    @GetMapping("/api/admin/payment-transactions/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<PaymentTransactionDTO>> detail(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(paymentService.getTransactionDetail(id)));
    }

    /** Lấy IP client, ưu tiên X-Forwarded-For khi chạy sau proxy/Nginx. */
    private static String clientIp(HttpServletRequest req) {
        String xff = req.getHeader("X-Forwarded-For");
        if (xff != null && !xff.isBlank()) return xff.split(",")[0].trim();
        return req.getRemoteAddr();
    }
}