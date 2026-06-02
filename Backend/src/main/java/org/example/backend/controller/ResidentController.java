package org.example.backend.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.example.backend.dto.response.ApiResponse;
import org.example.backend.dto.response.PageResponse;
import org.example.backend.dto.ResidentSummaryDTO;
import org.example.backend.dto.ResidentDetailDTO;
import org.example.backend.dto.request.CreateResidentRequest;
import org.example.backend.dto.request.ResidentSearchCriteria;
import org.example.backend.dto.request.UpdateResidentRequest;
import org.example.backend.entity.enums.ResidencyStatus;
import org.example.backend.entity.enums.ResidentStatus;
import org.example.backend.service.ResidentService;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/residents")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class ResidentController {

    private final ResidentService residentService;

    // F3.6 - Tra cứu nhân khẩu (có phân trang, lọc động)
    @GetMapping
    public ApiResponse<PageResponse<ResidentSummaryDTO>> search(
            @RequestParam(required = false) String name,
            @RequestParam(required = false) String idCard,
            @RequestParam(required = false) ResidencyStatus residencyStatus,
            @RequestParam(required = false) Long householdId,
            @RequestParam(required = false) ResidentStatus status,
            @PageableDefault(size = 20, sort = "fullName") Pageable pageable) {

        ResidentSearchCriteria criteria = new ResidentSearchCriteria(
                name, idCard, residencyStatus, householdId, status);

        return ApiResponse.ok(residentService.searchResidents(criteria, pageable));
    }

    // Xem chi tiết 1 nhân khẩu
    @GetMapping("/{id}")
    public ApiResponse<ResidentDetailDTO> getById(@PathVariable Long id) {
        return ApiResponse.ok(residentService.getResidentById(id));
    }

    // F3.1 - Thêm nhân khẩu
    @PostMapping
    public ApiResponse<ResidentDetailDTO> create(@Valid @RequestBody CreateResidentRequest req) {
        return ApiResponse.ok(residentService.createResident(req), "Thêm nhân khẩu thành công");
    }

    // F3.2 - Sửa nhân khẩu
    @PutMapping("/{id}")
    public ApiResponse<ResidentDetailDTO> update(
            @PathVariable Long id,
            @Valid @RequestBody UpdateResidentRequest req) {
        return ApiResponse.ok(residentService.updateResident(id, req), "Cập nhật nhân khẩu thành công");
    }

    // F3.3 - Chuyển nhân khẩu khỏi hộ (status = MOVED_OUT, KHÔNG xoá vật lý)
    @PutMapping("/{id}/move-out")
    public ApiResponse<ResidentDetailDTO> moveOut(@PathVariable Long id) {
        return ApiResponse.ok(residentService.moveOutResident(id), "Chuyển nhân khẩu khỏi hộ thành công");
    }

    // F3.4 - Đăng ký tạm trú
    @PutMapping("/{id}/temporary-residence")
    public ApiResponse<ResidentDetailDTO> registerTemporaryResidence(@PathVariable Long id) {
        return ApiResponse.ok(residentService.registerTemporaryResidence(id), "Đăng ký tạm trú thành công");
    }

}