package org.example.backend.controller;

import org.example.backend.dto.FeeDTO;
import org.example.backend.dto.response.ApiResponse;
import org.example.backend.dto.response.PageResponse;
import org.example.backend.service.FeeService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Pageable;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/fees")
public class FeeController {

    @Autowired
    private FeeService feeService;

    @PreAuthorize("hasRole('ADMIN')")
    @PostMapping
    public ApiResponse<FeeDTO> createFee(@RequestBody FeeDTO feeDTO) {
        return ApiResponse.ok(feeService.createFee(feeDTO), "Tạo khoản thu thành công");
    }

    @PreAuthorize("hasRole('ADMIN')")
    @PutMapping("/{id}")
    public ApiResponse<FeeDTO> updateFee(@PathVariable Long id, @RequestBody FeeDTO feeDTO) {
        return ApiResponse.ok(feeService.updateFee(id, feeDTO), "Cập nhật khoản thu thành công");
    }

    @PreAuthorize("hasRole('ADMIN')")
    @DeleteMapping("/{id}")
    public ApiResponse<Void> deleteFee(@PathVariable Long id) {
        feeService.deleteOrDeactivateFee(id);
        return ApiResponse.ok(null, "Xoá khoản thu thành công");
    }

    @PreAuthorize("hasRole('ADMIN')")
    @GetMapping
    public ApiResponse<PageResponse<FeeDTO>> getAllFees(Pageable pageable) {
        return ApiResponse.ok(PageResponse.of(feeService.getAllFees(pageable)));
    }

    @PreAuthorize("hasRole('ADMIN')")
    @GetMapping("/search")
    public ApiResponse<PageResponse<FeeDTO>> searchFees(@RequestParam(required = false) String keyword,
                                                        @RequestParam(required = false) String type,
                                                        @RequestParam(required = false) Boolean active,
                                                        Pageable pageable) {
        return ApiResponse.ok(PageResponse.of(feeService.searchFees(keyword, type, active, pageable)));
    }

    @PreAuthorize("hasRole('ADMIN')")
    @GetMapping("/{id}")
    public ApiResponse<FeeDTO> getFeeById(@PathVariable Long id) {
        return ApiResponse.ok(feeService.getFeeById(id));
    }
}