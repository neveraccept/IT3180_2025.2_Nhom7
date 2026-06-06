package org.example.backend.controller;

import org.example.backend.dto.AuditLogDTO;
import org.example.backend.dto.response.ApiResponse;
import org.example.backend.dto.response.PageResponse;
import org.example.backend.service.AuditLogService;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * API tra cứu nhật ký thao tác Admin. Nằm dưới /api/admin/** nên đã được
 * SecurityConfig giới hạn cho ROLE_ADMIN.
 */
@RestController
@RequestMapping("/api/admin/audit-logs")
public class AuditLogController {
    private final AuditLogService auditLogService;

    public AuditLogController(AuditLogService auditLogService) {
        this.auditLogService = auditLogService;
    }

    // GET /api/admin/audit-logs?page=0&size=20 -> mới nhất lên đầu (timestamp desc)
    @GetMapping
    public ResponseEntity<ApiResponse<PageResponse<AuditLogDTO>>> getAuditLogs(
            @PageableDefault(size = 20, sort = "timestamp", direction = Sort.Direction.DESC)
            Pageable pageable) {
        return ResponseEntity.ok(
                ApiResponse.ok(auditLogService.getLogs(pageable), "Lấy nhật ký hệ thống thành công!")
        );
    }
}
