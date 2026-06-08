package org.example.backend.controller;

import org.example.backend.dto.response.ApiResponse;
import org.example.backend.dto.response.PageResponse;
import org.example.backend.dto.UtilityBillDTO;
import org.example.backend.dto.UtilityBillImportResultDTO;
import org.example.backend.dto.UtilityFeeGenerationResultDTO;
import org.example.backend.dto.request.CreateUtilityBillRequest;
import org.example.backend.dto.request.GenerateUtilityFeeRequest;
import org.example.backend.dto.request.UpdateUtilityBillRequest;
import org.example.backend.entity.enums.UtilityBillStatus;
import org.example.backend.entity.enums.UtilityType;
import org.example.backend.service.UtilityBillService;
import org.example.backend.service.UtilityFeeService;
import jakarta.validation.Valid;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

/**
 * M7 - Quản lý hoá đơn điện/nước/internet.
 * Admin: nhập (F7.1), sửa/xoá (F7.2), xác nhận đã nộp tiền mặt (F7.3), tra cứu (F7.4).
 * Cư dân: chỉ tra cứu hoá đơn của hộ mình.
 *
 * Lưu ý route: endpoint xác nhận tiền mặt nằm dưới /api/admin/... theo SDD,
 * nên controller dùng /api làm prefix và chỉ định path tuyệt đối ở từng method.
 */
@RestController
@RequestMapping("/api")
public class UtilityBillController {

    private final UtilityBillService utilityBillService;
    private final UtilityFeeService utilityFeeService;

    public UtilityBillController(UtilityBillService utilityBillService,
                                 UtilityFeeService utilityFeeService) {
        this.utilityBillService = utilityBillService;
        this.utilityFeeService = utilityFeeService;
    }

    // F7.1 - Nhập hoá đơn. POST /api/utility-bills
    @PostMapping("/utility-bills")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<UtilityBillDTO>> create(
            @Valid @RequestBody CreateUtilityBillRequest req) {
        UtilityBillDTO dto = utilityBillService.create(req);
        return ResponseEntity.ok(ApiResponse.ok(dto, "Tạo hoá đơn thành công"));
    }

    // F7.1 (mở rộng) - Nhập hoá đơn hàng loạt cho nhiều hộ từ file Excel. POST /api/utility-bills/import
    @PostMapping(value = "/utility-bills/import", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<UtilityBillImportResultDTO>> importExcel(
            @RequestParam("file") MultipartFile file) {
        UtilityBillImportResultDTO result = utilityBillService.importFromExcel(file);
        return ResponseEntity.ok(ApiResponse.ok(result,
                "Đã nhập " + result.createdCount() + " hoá đơn" +
                        (result.failedCount() > 0 ? ", " + result.failedCount() + " dòng lỗi" : "")));
    }

    // F7.1 (mở rộng) - Tải file Excel mẫu để nhập hàng loạt. GET /api/utility-bills/import-template
    @GetMapping("/utility-bills/import-template")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<byte[]> importTemplate() {
        byte[] body = utilityBillService.buildImportTemplate();
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"mau-hoa-don-dien-nuoc.xlsx\"")
                .contentType(MediaType.parseMediaType(
                        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
                .body(body);
    }

    // Sinh hoá đơn phí điện nước theo tháng cho từng hộ. POST /api/admin/utility-fees/generate
    // Tạo đợt thu "Phí điện nước tháng M/YYYY" và sinh phiếu nộp cho mỗi hộ có hoá đơn chưa nộp.
    @PostMapping("/admin/utility-fees/generate")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<UtilityFeeGenerationResultDTO>> generateUtilityFees(
            @Valid @RequestBody GenerateUtilityFeeRequest req) {
        UtilityFeeGenerationResultDTO result =
                utilityFeeService.generateInvoices(req.month(), req.year());
        return ResponseEntity.ok(ApiResponse.ok(result,
                "Đã tạo " + result.invoiceCount() + " hoá đơn phí điện nước"));
    }

    // F7.2 - Sửa hoá đơn. PUT /api/utility-bills/{id}
    @PutMapping("/utility-bills/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<UtilityBillDTO>> update(
            @PathVariable Long id,
            @Valid @RequestBody UpdateUtilityBillRequest req) {
        UtilityBillDTO dto = utilityBillService.update(id, req);
        return ResponseEntity.ok(ApiResponse.ok(dto, "Cập nhật hoá đơn thành công"));
    }

    // F7.2 - Xoá hoá đơn. DELETE /api/utility-bills/{id}
    @DeleteMapping("/utility-bills/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable Long id) {
        utilityBillService.delete(id);
        return ResponseEntity.ok(ApiResponse.ok(null, "Đã xoá hoá đơn"));
    }

    // F7.3 - Ghi nhận đã nộp tiền mặt. PUT /api/admin/utility-bills/{id}/confirm-cash
    @PutMapping("/admin/utility-bills/{id}/confirm-cash")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<UtilityBillDTO>> confirmCash(@PathVariable Long id) {
        UtilityBillDTO dto = utilityBillService.confirmCash(id);
        return ResponseEntity.ok(ApiResponse.ok(dto, "Đã ghi nhận nộp tiền mặt"));
    }

    // F7.4 - Admin tra cứu hoá đơn (lọc theo hộ/loại/tháng/năm/trạng thái).
    // GET /api/utility-bills?householdId=&type=&month=&year=&status=
    @GetMapping("/utility-bills")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<PageResponse<UtilityBillDTO>>> search(
            @RequestParam(required = false) Long householdId,
            @RequestParam(required = false) UtilityType type,
            @RequestParam(required = false) Integer month,
            @RequestParam(required = false) Integer year,
            @RequestParam(required = false) UtilityBillStatus status,
            @PageableDefault(size = 20, sort = {"year", "month"}, direction = Sort.Direction.DESC)
            Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.ok(
                utilityBillService.search(householdId, type, month, year, status, pageable)));
    }

    // F7.4 - Admin xem chi tiết hoá đơn. GET /api/utility-bills/{id}
    @GetMapping("/utility-bills/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<UtilityBillDTO>> getDetail(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(utilityBillService.getDetail(id)));
    }

    // F7.4 - Cư dân xem hoá đơn của hộ mình. GET /api/utility-bills/my-household
    @GetMapping("/utility-bills/my-household")
    @PreAuthorize("hasRole('RESIDENT')")
    public ResponseEntity<ApiResponse<PageResponse<UtilityBillDTO>>> myHousehold(
            @RequestParam(required = false) UtilityType type,
            @RequestParam(required = false) Integer month,
            @RequestParam(required = false) Integer year,
            @RequestParam(required = false) UtilityBillStatus status,
            @PageableDefault(size = 20, sort = {"year", "month"}, direction = Sort.Direction.DESC)
            Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.ok(
                utilityBillService.listMyHousehold(type, month, year, status, pageable)));
    }
}
