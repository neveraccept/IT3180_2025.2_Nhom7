package org.example.backend.controller;

import org.example.backend.dto.response.ApiResponse;
import org.example.backend.dto.ComplaintDTO;
import org.example.backend.dto.response.PageResponse;
import org.example.backend.dto.request.ComplaintCreateRequest;
import org.example.backend.dto.request.ComplaintResponseRequest;
import org.example.backend.entity.enums.ComplaintCategory;
import org.example.backend.entity.enums.ComplaintStatus;
import org.example.backend.service.ComplaintService;
import jakarta.validation.Valid;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/complaints")
public class ComplaintController {

    private final ComplaintService complaintService;

    public ComplaintController(ComplaintService complaintService) {
        this.complaintService = complaintService;
    }

    // F8.1 – Cư dân gửi khiếu nại
    @PostMapping
    @PreAuthorize("hasRole('RESIDENT')")
    public ResponseEntity<ApiResponse<ComplaintDTO>> create(
            @Valid @RequestBody ComplaintCreateRequest req) {
        ComplaintDTO created = complaintService.create(req);
        return ResponseEntity.ok(ApiResponse.ok(created, "Đã gửi khiếu nại thành công"));
    }

    // F8.1 (xem) – Cư dân xem khiếu nại của mình
    @GetMapping("/my")
    @PreAuthorize("hasRole('RESIDENT')")
    public ResponseEntity<ApiResponse<PageResponse<ComplaintDTO>>> myComplaints(
            @PageableDefault(size = 20, sort = "createdAt", direction = Sort.Direction.DESC)
            Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.ok(complaintService.getMyComplaints(pageable)));
    }

    // Xem chi tiết – Admin hoặc chính chủ khiếu nại (kiểm tra quyền trong Service)
    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'RESIDENT')")
    public ResponseEntity<ApiResponse<ComplaintDTO>> getDetail(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(complaintService.getById(id)));
    }

    // F8.2 – Admin xem danh sách khiếu nại
    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<PageResponse<ComplaintDTO>>> list(
            @RequestParam(required = false) ComplaintStatus status,
            @RequestParam(required = false) ComplaintCategory category,
            @PageableDefault(size = 20, sort = "createdAt", direction = Sort.Direction.DESC)
            Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.ok(
                complaintService.list(status, category, pageable)));
    }

    // F8.3 + F8.4 – Admin phản hồi / đánh dấu đã xử lý
    @PutMapping("/{id}/response")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<ComplaintDTO>> respond(
            @PathVariable Long id,
            @Valid @RequestBody ComplaintResponseRequest req) {
        ComplaintDTO updated = complaintService.respond(id, req);
        return ResponseEntity.ok(ApiResponse.ok(updated, "Đã cập nhật xử lý khiếu nại"));
    }
}