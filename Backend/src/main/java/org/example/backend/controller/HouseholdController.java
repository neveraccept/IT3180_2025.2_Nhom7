package org.example.backend.controller;

import jakarta.validation.Valid;
import org.example.backend.dto.HouseholdSummaryDTO;
import org.example.backend.dto.MoveInResultDTO;
import org.example.backend.dto.ResidentDetailDTO;
import org.example.backend.dto.UserDTO;
import org.example.backend.dto.request.AddMemberRequest;
import org.example.backend.dto.request.MoveInRequest;
import org.example.backend.dto.response.ApiResponse;
import org.example.backend.service.HouseholdLifecycleService;
import org.example.backend.service.UserService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Các API theo "hành động nghiệp vụ" lấy Hộ gia đình làm trung tâm.
 * Bổ sung bên cạnh các endpoint cũ lồng dưới /api/apartments/{id}/household (vẫn giữ nguyên).
 */
@RestController
@RequestMapping("/api/households")
@PreAuthorize("hasRole('ADMIN')")
public class HouseholdController {

    private final HouseholdLifecycleService householdService;
    private final UserService userService;

    public HouseholdController(HouseholdLifecycleService householdService,
                               UserService userService) {
        this.householdService = householdService;
        this.userService = userService;
    }

    // Action 1 – Bàn giao nhà (Move-in): tạo chủ hộ + hộ + (tùy chọn) tài khoản trong 1 giao dịch.
    @PostMapping("/move-in")
    public ResponseEntity<ApiResponse<MoveInResultDTO>> moveIn(@Valid @RequestBody MoveInRequest req) {
        MoveInResultDTO result = householdService.moveIn(req);
        return ResponseEntity.status(201).body(
                ApiResponse.ok(result, "Bàn giao căn hộ cho hộ mới thành công"));
    }

    // Action 2 – Thêm nhân khẩu vào hộ đã có.
    @PostMapping("/{householdId}/members")
    public ResponseEntity<ApiResponse<ResidentDetailDTO>> addMember(
            @PathVariable Long householdId,
            @Valid @RequestBody AddMemberRequest req) {
        ResidentDetailDTO created = householdService.addMember(householdId, req);
        return ResponseEntity.status(201).body(
                ApiResponse.ok(created, "Thêm nhân khẩu vào hộ thành công"));
    }

    // Action 4 – Chuyển đi / Giải tán hộ: hộ MOVED_OUT, căn hộ AVAILABLE, khóa tài khoản cư dân.
    @PostMapping("/{householdId}/move-out")
    public ResponseEntity<ApiResponse<HouseholdSummaryDTO>> moveOut(@PathVariable Long householdId) {
        HouseholdSummaryDTO result = householdService.moveOutByHouseholdId(householdId);
        return ResponseEntity.ok(ApiResponse.ok(result, "Đã chuyển cả hộ ra khỏi căn hộ"));
    }

    // Danh sách tài khoản gắn với hộ (tab "Tài khoản" trong trang Căn hộ).
    @GetMapping("/{householdId}/accounts")
    public ResponseEntity<ApiResponse<List<UserDTO>>> getAccounts(@PathVariable Long householdId) {
        return ResponseEntity.ok(ApiResponse.ok(userService.getAccountsByHousehold(householdId)));
    }
}
