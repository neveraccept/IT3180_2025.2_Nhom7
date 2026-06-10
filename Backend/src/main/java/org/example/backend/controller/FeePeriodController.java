package org.example.backend.controller;

import jakarta.validation.Valid;
import org.example.backend.dto.FeePeriodDTO;
import org.example.backend.dto.response.ApiResponse;
import org.example.backend.dto.response.PageResponse;
import org.example.backend.service.FeePeriodService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Pageable;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/fee-periods")
public class FeePeriodController {

    @Autowired
    private FeePeriodService feePeriodService;

    @PreAuthorize("hasRole('ADMIN')")
    @GetMapping
    public ApiResponse<PageResponse<FeePeriodDTO>> getAllFeePeriods(Pageable pageable) {
        return ApiResponse.ok(PageResponse.of(feePeriodService.getAllFeePeriods(pageable)));
    }

    @PreAuthorize("hasRole('ADMIN')")
    @GetMapping("/{id}")
    public ApiResponse<FeePeriodDTO> getFeePeriodById(@PathVariable Long id) {
        return ApiResponse.ok(feePeriodService.getFeePeriodById(id));
    }

    @PreAuthorize("hasRole('ADMIN')")
    @PostMapping
    public ApiResponse<FeePeriodDTO> createFeePeriod(@Valid @RequestBody FeePeriodDTO feePeriodDTO) {
        return ApiResponse.ok(feePeriodService.createFeePeriod(feePeriodDTO), "Tạo đợt thu thành công");
    }

    @PreAuthorize("hasRole('ADMIN')")
    @PutMapping("/{id}")
    public ApiResponse<FeePeriodDTO> updateFeePeriod(@PathVariable Long id, @Valid @RequestBody FeePeriodDTO feePeriodDTO) {
        return ApiResponse.ok(feePeriodService.updateFeePeriod(id, feePeriodDTO), "Cập nhật đợt thu thành công");
    }

    @PreAuthorize("hasRole('ADMIN')")
    @PutMapping("/{id}/close")
    public ApiResponse<Void> closeFeePeriod(@PathVariable Long id) {
        feePeriodService.closeFeePeriod(id);
        return ApiResponse.ok(null, "Đã đóng đợt thu");
    }
}
