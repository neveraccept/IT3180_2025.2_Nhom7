package org.example.backend.controller;

import org.example.backend.dto.response.ApiResponse;
import org.example.backend.dto.FeePeriodStatisticsDTO;
import org.example.backend.dto.HouseholdPaymentSummaryDTO;
import org.example.backend.dto.ResidentStatisticsDTO;
import org.example.backend.service.ReportService;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;

/**
 * M10 - Tra cứu, thống kê và xuất báo cáo.
 * Toàn bộ endpoint chỉ dành cho Admin.
 *
 *  - Thống kê số liệu -> JSON bọc trong ApiResponse.ok(...)
 *  - Xuất file Excel/PDF -> ResponseEntity<byte[]> kèm Content-Disposition: attachment
 */
@RestController
@RequestMapping("/api/reports")
@PreAuthorize("hasRole('ADMIN')")
public class ReportController {

    private static final String XLSX_MIME =
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

    private final ReportService reportService;

    public ReportController(ReportService reportService) {
        this.reportService = reportService;
    }

    // ===================== THỐNG KÊ (JSON) =====================

    // F10.1 - Thống kê tình trạng MỘT HOẶC NHIỀU đợt thu (feePeriodIds=1,2,3),
    // lọc tuỳ chọn theo khoảng ngày thanh toán.
    @GetMapping("/fee-periods/statistics")
    public ResponseEntity<ApiResponse<FeePeriodStatisticsDTO>> feePeriodStatistics(
            @RequestParam List<Long> feePeriodIds,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        return ResponseEntity.ok(ApiResponse.ok(reportService.getFeePeriodStatistics(feePeriodIds, from, to)));
    }

    // F10.3 - Thống kê theo hộ gia đình (lọc tuỳ chọn theo khoảng ngày thanh toán)
    @GetMapping("/households/statistics")
    public ResponseEntity<ApiResponse<List<HouseholdPaymentSummaryDTO>>> householdStatistics(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        return ResponseEntity.ok(ApiResponse.ok(reportService.getHouseholdStatistics(from, to)));
    }

    // F10.4 - Thống kê dân cư (lọc tuỳ chọn theo khoảng ngày chuyển vào của hộ)
    @GetMapping("/residents/statistics")
    public ResponseEntity<ApiResponse<ResidentStatisticsDTO>> residentStatistics(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        return ResponseEntity.ok(ApiResponse.ok(reportService.getResidentStatistics(from, to)));
    }

    // ===================== XUáº¤T EXCEL (F10.5) =====================

    @GetMapping("/fee-periods/excel")
    public ResponseEntity<byte[]> feePeriodExcel(@RequestParam List<Long> feePeriodIds) {
        return excel(reportService.exportFeePeriodExcel(feePeriodIds), "tinh-trang-dot-thu");
    }

    @GetMapping("/households/excel")
    public ResponseEntity<byte[]> householdExcel() {
        return excel(reportService.exportHouseholdExcel(), "thong-ke-theo-ho");
    }

    @GetMapping("/residents/excel")
    public ResponseEntity<byte[]> residentExcel() {
        return excel(reportService.exportResidentExcel(), "thong-ke-dan-cu");
    }

    @GetMapping("/payment-transactions/excel")
    public ResponseEntity<byte[]> transactionExcel(
            @RequestParam(required = false) String status,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        byte[] file = reportService.exportTransactionExcel(status, atStart(from), atEnd(to));
        return excel(file, "giao-dich-online");
    }

    // ===================== XUáº¤T PDF (F10.6) =====================

    @GetMapping("/fee-periods/pdf")
    public ResponseEntity<byte[]> feePeriodPdf(@RequestParam List<Long> feePeriodIds) {
        return pdf(reportService.exportFeePeriodPdf(feePeriodIds), "tinh-trang-dot-thu");
    }

    @GetMapping("/households/pdf")
    public ResponseEntity<byte[]> householdPdf() {
        return pdf(reportService.exportHouseholdPdf(), "thong-ke-theo-ho");
    }

    @GetMapping("/residents/pdf")
    public ResponseEntity<byte[]> residentPdf() {
        return pdf(reportService.exportResidentPdf(), "thong-ke-dan-cu");
    }

    @GetMapping("/payment-transactions/pdf")
    public ResponseEntity<byte[]> transactionPdf(
            @RequestParam(required = false) String status,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        byte[] file = reportService.exportTransactionPdf(status, atStart(from), atEnd(to));
        return pdf(file, "giao-dich-online");
    }

    // ===================== Helpers táº¡o response táº£i file =====================

    private ResponseEntity<byte[]> excel(byte[] body, String baseName) {
        return download(body, baseName + ".xlsx", XLSX_MIME);
    }

    private ResponseEntity<byte[]> pdf(byte[] body, String baseName) {
        return download(body, baseName + ".pdf", MediaType.APPLICATION_PDF_VALUE);
    }

    private ResponseEntity<byte[]> download(byte[] body, String filename, String contentType) {
        String encoded = URLEncoder.encode(filename, StandardCharsets.UTF_8).replace("+", "%20");
        String disposition = "attachment; filename=\"" + filename + "\"; filename*=UTF-8''" + encoded;
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, disposition)
                .contentType(MediaType.parseMediaType(contentType))
                .contentLength(body.length)
                .body(body);
    }

    private static LocalDateTime atStart(LocalDate d) {
        return d == null ? null : d.atStartOfDay();
    }

    private static LocalDateTime atEnd(LocalDate d) {
        return d == null ? null : d.atTime(LocalTime.MAX);
    }
}
