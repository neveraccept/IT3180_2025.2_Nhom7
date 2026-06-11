package org.example.backend.controller;

import org.example.backend.dto.response.ApiResponse;
import org.example.backend.dto.response.PageResponse;
import org.example.backend.dto.ParkingFeeGenerationResultDTO;
import org.example.backend.dto.ParkingRegistrationDTO;
import org.example.backend.dto.ParkingSlotDTO;
import org.example.backend.dto.ParkingSummaryDTO;
import org.example.backend.dto.request.CreateParkingRegistrationRequest;
import org.example.backend.dto.request.GenerateParkingFeeRequest;
import org.example.backend.service.ParkingFeeService;
import org.example.backend.service.ParkingService;
import jakarta.validation.Valid;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

/**
 * M6 - Quản lý chỗ gửi xe và lượt đăng ký/cho thuê.
 * Admin: F6.4 (xem tình trạng chỗ), F6.1 gán xe vào chỗ, F6.5 cho thuê chỗ thừa, kết thúc lượt.
 * Cư dân: xem các lượt gửi xe đang hiệu lực của hộ mình.
 */
@RestController
@RequestMapping("/api")
public class ParkingController {

    private final ParkingService parkingService;
    private final ParkingFeeService parkingFeeService;

    public ParkingController(ParkingService parkingService,
                            ParkingFeeService parkingFeeService) {
        this.parkingService = parkingService;
        this.parkingFeeService = parkingFeeService;
    }

    // F6.4 - Danh sách chỗ gửi. GET /api/parking-slots
    @GetMapping("/parking-slots")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<PageResponse<ParkingSlotDTO>>> listSlots(
            @PageableDefault(size = 20, sort = "code", direction = Sort.Direction.ASC)
            Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.ok(parkingService.listSlots(pageable)));
    }

    // F6.4 - Tình trạng chỗ gửi (tổng/đã dùng/cho thuê/còn trống).
    // GET /api/parking-slots/summary
    @GetMapping("/parking-slots/summary")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<ParkingSummaryDTO>> summary() {
        return ResponseEntity.ok(ApiResponse.ok(parkingService.summary()));
    }

    // F6.1 (gán xe hộ) + F6.5 (cho thuê chỗ thừa). POST /api/parking-registrations
    @PostMapping("/parking-registrations")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<ParkingRegistrationDTO>> createRegistration(
            @Valid @RequestBody CreateParkingRegistrationRequest req) {
        ParkingRegistrationDTO dto = parkingService.createRegistration(req);
        return ResponseEntity.ok(ApiResponse.ok(dto, "Đăng ký chỗ gửi xe thành công"));
    }

    // F6.2 / F6.5 - Kết thúc lượt đăng ký. PUT /api/parking-registrations/{id}/end
    @PutMapping("/parking-registrations/{id}/end")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<ParkingRegistrationDTO>> endRegistration(
            @PathVariable Long id) {
        ParkingRegistrationDTO dto = parkingService.endRegistration(id);
        return ResponseEntity.ok(ApiResponse.ok(dto, "Đã kết thúc lượt gửi xe"));
    }

    // Sinh hóa đơn phí gửi xe theo tháng cho từng hộ. POST /api/admin/parking-fees/generate
    // Tạo đợt thu "Phí gửi xe tháng M/YYYY" và sinh phiếu nộp cho mỗi hộ có lượt gửi xe hiệu lực.
    @PostMapping("/admin/parking-fees/generate")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<ParkingFeeGenerationResultDTO>> generateParkingFees(
            @Valid @RequestBody GenerateParkingFeeRequest req) {
        ParkingFeeGenerationResultDTO result =
                parkingFeeService.generateInvoices(req.month(), req.year());
        return ResponseEntity.ok(ApiResponse.ok(result,
                "Đã tạo " + result.invoiceCount() + " hóa đơn phí gửi xe"));
    }

    // Cư dân xem lượt gửi xe của hộ. GET /api/parking-registrations/my-household
    @GetMapping("/parking-registrations/my-household")
    @PreAuthorize("hasRole('RESIDENT')")
    public ResponseEntity<ApiResponse<PageResponse<ParkingRegistrationDTO>>> myHousehold(
            @PageableDefault(size = 20, sort = "startDate", direction = Sort.Direction.DESC)
            Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.ok(parkingService.listMyHousehold(pageable)));
    }
}
