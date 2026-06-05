package org.example.backend.controller;

import org.example.backend.dto.SystemConfigDTO;
import org.example.backend.dto.response.ApiResponse;
import org.example.backend.service.SystemConfigService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;

/**
 * Quản lý cấu hình đơn giá gốc của hệ thống (điện/nước/internet...).
 * Chỉ Admin được xem và chỉnh sửa.
 */
@RestController
@RequestMapping("/api/system-configs")
@PreAuthorize("hasRole('ADMIN')")
public class SystemConfigController {

    private final SystemConfigService service;

    public SystemConfigController(SystemConfigService service) {
        this.service = service;
    }

    // GET /api/system-configs -> danh sách đơn giá hệ thống
    @GetMapping
    public ResponseEntity<ApiResponse<List<SystemConfigDTO>>> getAll() {
        return ResponseEntity.ok(ApiResponse.ok(service.getAll()));
    }

    // PUT /api/system-configs/{key} -> cập nhật giá trị đơn giá
    @PutMapping("/{key}")
    public ResponseEntity<ApiResponse<SystemConfigDTO>> update(
            @PathVariable String key,
            @RequestBody UpdateConfigRequest req) {
        return ResponseEntity.ok(ApiResponse.ok(
                service.updateValue(key, req.value()), "Đã cập nhật đơn giá"));
    }

    public record UpdateConfigRequest(BigDecimal value) {}
}
