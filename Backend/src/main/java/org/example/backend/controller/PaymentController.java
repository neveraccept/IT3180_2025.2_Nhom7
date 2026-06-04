package org.example.backend.controller;

import org.example.backend.dto.response.ApiResponse;
import org.example.backend.dto.response.PageResponse;
import org.example.backend.dto.PaymentDetailDTO;
import org.example.backend.security.CustomUserDetails;
import org.example.backend.service.PaymentService;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
public class PaymentController {

    private final PaymentService paymentService;

    public PaymentController(PaymentService paymentService) {
        this.paymentService = paymentService;
    }

    //  Cư dân xem phiếu nộp của hộ mình
    //  GET /api/payments/my-household
    @GetMapping("/api/payments/my-household")
    @PreAuthorize("hasRole('RESIDENT')")
    public ResponseEntity<ApiResponse<PageResponse<PaymentDetailDTO>>> myHousehold(
            @AuthenticationPrincipal CustomUserDetails me,
            @PageableDefault(size = 20, sort = "id", direction = Sort.Direction.DESC)
            Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.ok(
                paymentService.listMyHousehold(me.getUser().getHousehold().getId(), pageable)));
    }

    //  Admin xem / lọc phiếu nộp (theo householdId, status)
    //  GET /api/admin/payments?householdId=&status=
    @GetMapping("/api/admin/payments")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<PageResponse<PaymentDetailDTO>>> list(
            @RequestParam(required = false) Long householdId,
            @RequestParam(required = false) String status,
            @PageableDefault(size = 20, sort = "id", direction = Sort.Direction.DESC)
            Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.ok(
                paymentService.listPayments(householdId, status, pageable)));
    }

    //  Admin xác nhận đã nộp đủ tiền mặt
    //  PUT /api/admin/payments/{id}/confirm-cash
    @PutMapping("/api/admin/payments/{id}/confirm-cash")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<PaymentDetailDTO>> confirmCash(
            @PathVariable Long id,
            @AuthenticationPrincipal CustomUserDetails admin) {
        PaymentDetailDTO dto = paymentService.confirmCashPayment(id, admin.getUser().getId());
        return ResponseEntity.ok(ApiResponse.ok(dto, "Xác nhận nộp tiền mặt thành công"));
    }
}