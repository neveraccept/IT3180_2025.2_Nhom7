package org.example.backend.controller;

import org.example.backend.dto.response.ApiResponse;
import org.example.backend.dto.response.PageResponse;
import org.example.backend.dto.PaymentDetailDTO;
import org.example.backend.dto.request.ConfirmCashPaymentRequest;
import org.example.backend.entity.Household;
import org.example.backend.exception.BadRequestException;
import org.example.backend.security.CurrentUserService;
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
    private final CurrentUserService currentUserService;

    public PaymentController(PaymentService paymentService,
                            CurrentUserService currentUserService) {
        this.paymentService = paymentService;
        this.currentUserService = currentUserService;
    }

    //  Cư dân xem phiếu nộp của hộ mình
    //  GET /api/payments/my-household
    @GetMapping("/api/payments/my-household")
    @PreAuthorize("hasRole('RESIDENT')")
    public ResponseEntity<ApiResponse<PageResponse<PaymentDetailDTO>>> myHousehold(
            @PageableDefault(size = 20, sort = "id", direction = Sort.Direction.DESC)
            Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.ok(
                paymentService.listMyHousehold(currentHouseholdId(), pageable)));
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

    //  Admin xem / lọc phiếu nộp (theo householdId, status, tên khoản thu)
    //  GET /api/admin/payments?householdId=&status=&keyword=
    @GetMapping("/api/admin/payments")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<PageResponse<PaymentDetailDTO>>> list(
            @RequestParam(required = false) Long householdId,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String keyword,
            @PageableDefault(size = 20, sort = "id", direction = Sort.Direction.DESC)
            Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.ok(
                paymentService.listPayments(householdId, status, keyword, pageable)));
    }

    //  Admin xác nhận đã nộp đủ tiền mặt
    //  PUT /api/admin/payments/{id}/confirm-cash
    @PutMapping("/api/admin/payments/{id}/confirm-cash")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<PaymentDetailDTO>> confirmCash(
            @PathVariable Long id,
            @RequestBody(required = false) ConfirmCashPaymentRequest req,
            @AuthenticationPrincipal CustomUserDetails admin) {
        java.math.BigDecimal customAmount = req != null ? req.amount() : null;
        PaymentDetailDTO dto = paymentService.confirmCashPayment(id, admin.getUser().getId(), customAmount);
        return ResponseEntity.ok(ApiResponse.ok(dto, "Xác nhận nộp tiền mặt thành công"));
    }
}