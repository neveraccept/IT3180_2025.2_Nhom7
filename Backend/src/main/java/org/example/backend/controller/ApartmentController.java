package org.example.backend.controller;

import org.example.backend.dto.ApartmentDTO;
import org.example.backend.dto.ApartmentDetailDTO;
import org.example.backend.dto.response.ApiResponse;
import org.example.backend.dto.HouseholdSummaryDTO;
import org.example.backend.dto.response.PageResponse;
import org.example.backend.dto.request.ApartmentUpdateRequest;
import org.example.backend.dto.request.AssignHouseholdRequest;
import org.example.backend.dto.request.UpdateHouseholdRequest;
import org.example.backend.entity.enums.ApartmentStatus;
import org.example.backend.service.ApartmentService;
import org.example.backend.service.HouseholdLifecycleService;
import jakarta.validation.Valid;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/apartments")
@PreAuthorize("hasRole('ADMIN')")
public class ApartmentController {

    private final ApartmentService apartmentService;
    private final HouseholdLifecycleService householdService;

    public ApartmentController(ApartmentService apartmentService,
                               HouseholdLifecycleService householdService) {
        this.apartmentService = apartmentService;
        this.householdService = householdService;
    }

    //  F2.1 – Xem danh sách căn hộ
    //  GET /api/apartments?page=&size=&sort=

    @GetMapping
    public ResponseEntity<ApiResponse<PageResponse<ApartmentDTO>>> list(
            @PageableDefault(size = 20, sort = "code", direction = Sort.Direction.ASC)
            Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.ok(apartmentService.list(pageable)));
    }


    //  F2.2 – Tìm kiếm căn hộ
    //  GET /api/apartments/search?code=&floor=&status=&headName=&page=&size=

    @GetMapping("/search")
    public ResponseEntity<ApiResponse<PageResponse<ApartmentDTO>>> search(
            @RequestParam(required = false) String code,
            @RequestParam(required = false) Integer floor,
            @RequestParam(required = false) ApartmentStatus status,
            @RequestParam(required = false) String headName,
            @PageableDefault(size = 20, sort = "code", direction = Sort.Direction.ASC)
            Pageable pageable) {
        PageResponse<ApartmentDTO> result =
                apartmentService.search(code, floor, status, headName, pageable);
        return ResponseEntity.ok(ApiResponse.ok(result));
    }


    //  F2.3 + F2.5 – Xem chi tiết căn hộ (kèm hộ dân ACTIVE)
    //  GET /api/apartments/{id}

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<ApartmentDetailDTO>> getDetail(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(apartmentService.getDetail(id)));
    }

    //  F2.4 – Chỉnh sửa thông tin căn hộ
    //  PUT /api/apartments/{id}

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<ApartmentDetailDTO>> update(
            @PathVariable Long id,
            @Valid @RequestBody ApartmentUpdateRequest req) {
        ApartmentDetailDTO updated = apartmentService.update(id, req);
        return ResponseEntity.ok(ApiResponse.ok(updated, "Cập nhật căn hộ thành công"));
    }


    //  F2.5 – Xem hộ dân/hộ khẩu đang ở trong căn hộ
    //  GET /api/apartments/{id}/household

    @GetMapping("/{id}/household")
    public ResponseEntity<ApiResponse<HouseholdSummaryDTO>> getCurrentHousehold(
            @PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(householdService.getActiveHousehold(id)));
    }


    //  F2.7 – Gán hộ vào căn hộ trống
    //  POST /api/apartments/{id}/household

    @PostMapping("/{id}/household")
    public ResponseEntity<ApiResponse<HouseholdSummaryDTO>> assignHousehold(
            @PathVariable Long id,
            @Valid @RequestBody AssignHouseholdRequest req) {
        HouseholdSummaryDTO h = householdService.assignHousehold(id, req);
        return ResponseEntity.ok(ApiResponse.ok(h, "Gán hộ dân vào căn hộ thành công"));
    }


    //  F2.6 + F2.8 – Cập nhật / Chuyển hộ ra khỏi căn hộ
    //  PUT /api/apartments/{id}/household

    @PutMapping("/{id}/household")
    public ResponseEntity<ApiResponse<HouseholdSummaryDTO>> updateOrMoveOutHousehold(
            @PathVariable Long id,
            @Valid @RequestBody UpdateHouseholdRequest req) {
        HouseholdSummaryDTO h = householdService.updateHousehold(id, req);
        String message = req.action() == UpdateHouseholdRequest.Action.MOVE_OUT
                ? "Đã chuyển hộ ra khỏi căn hộ"
                : "Cập nhật thông tin hộ thành công";
        return ResponseEntity.ok(ApiResponse.ok(h, message));
    }
}


