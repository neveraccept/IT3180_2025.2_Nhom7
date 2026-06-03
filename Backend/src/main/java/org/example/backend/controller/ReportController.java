package org.example.backend.controller;

import org.example.backend.dto.response.ApiResponse;
import org.example.backend.dto.DonationStatisticsDTO;
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
 * M10 â€“ Tra cá»©u, thá»‘ng kÃª vÃ  xuáº¥t bÃ¡o cÃ¡o.
 * ToÃ n bá»™ endpoint chá»‰ dÃ nh cho Admin.
 *
 *  - Thá»‘ng kÃª sá»‘ liá»‡u  â†’ JSON bá»c trong ApiResponse.ok(...)
 *  - Xuáº¥t file Excel/PDF â†’ ResponseEntity&lt;byte[]&gt; kÃ¨m Content-Disposition: attachment
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

    // ===================== THá»NG KÃŠ (JSON) =====================

    // F10.1 â€“ Thá»‘ng kÃª tÃ¬nh tráº¡ng Ä‘á»£t thu
    @GetMapping("/fee-periods/{id}/statistics")
    public ResponseEntity<ApiResponse<FeePeriodStatisticsDTO>> feePeriodStatistics(
            @PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(reportService.getFeePeriodStatistics(id)));
    }

    // F10.2 â€“ Thá»‘ng kÃª khoáº£n Ä‘Ã³ng gÃ³p theo Ä‘á»£t
    @GetMapping("/donations/{feePeriodId}/statistics")
    public ResponseEntity<ApiResponse<DonationStatisticsDTO>> donationStatistics(
            @PathVariable Long feePeriodId) {
        return ResponseEntity.ok(ApiResponse.ok(reportService.getDonationStatistics(feePeriodId)));
    }

    // F10.3 â€“ Thá»‘ng kÃª theo há»™ gia Ä‘Ã¬nh
    @GetMapping("/households/statistics")
    public ResponseEntity<ApiResponse<List<HouseholdPaymentSummaryDTO>>> householdStatistics() {
        return ResponseEntity.ok(ApiResponse.ok(reportService.getHouseholdStatistics()));
    }

    // F10.4 â€“ Thá»‘ng kÃª dÃ¢n cÆ°
    @GetMapping("/residents/statistics")
    public ResponseEntity<ApiResponse<ResidentStatisticsDTO>> residentStatistics() {
        return ResponseEntity.ok(ApiResponse.ok(reportService.getResidentStatistics()));
    }

    // ===================== XUáº¤T EXCEL (F10.5) =====================

    @GetMapping("/fee-periods/{id}/excel")
    public ResponseEntity<byte[]> feePeriodExcel(@PathVariable Long id) {
        return excel(reportService.exportFeePeriodExcel(id), "tinh-trang-dot-thu-" + id);
    }

    @GetMapping("/donations/{feePeriodId}/excel")
    public ResponseEntity<byte[]> donationExcel(@PathVariable Long feePeriodId) {
        return excel(reportService.exportDonationExcel(feePeriodId), "dong-gop-dot-" + feePeriodId);
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

    @GetMapping("/fee-periods/{id}/pdf")
    public ResponseEntity<byte[]> feePeriodPdf(@PathVariable Long id) {
        return pdf(reportService.exportFeePeriodPdf(id), "tinh-trang-dot-thu-" + id);
    }

    @GetMapping("/donations/{feePeriodId}/pdf")
    public ResponseEntity<byte[]> donationPdf(@PathVariable Long feePeriodId) {
        return pdf(reportService.exportDonationPdf(feePeriodId), "dong-gop-dot-" + feePeriodId);
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
