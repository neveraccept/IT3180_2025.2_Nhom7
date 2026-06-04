package org.example.backend.controller;

import org.example.backend.dto.response.ApiResponse;
import org.example.backend.dto.response.PageResponse;
import org.example.backend.dto.VehicleDTO;
import org.example.backend.dto.request.RegisterVehicleRequest;
import org.example.backend.dto.request.UpdateVehicleRequest;
import org.example.backend.service.VehicleService;
import jakarta.validation.Valid;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

/**
 * M6 - Quản lý phương tiện của hộ dân.
 * Admin: đăng ký / cập nhật / huỷ / tra cứu theo hộ.
 * Cư dân: chỉ xem xe của hộ mình.
 */
@RestController
@RequestMapping("/api/vehicles")
public class VehicleController {

    private final VehicleService vehicleService;

    public VehicleController(VehicleService vehicleService) {
        this.vehicleService = vehicleService;
    }

    // F6.1 - Đăng ký xe cho hộ. POST /api/vehicles
    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<VehicleDTO>> register(
            @Valid @RequestBody RegisterVehicleRequest req) {
        VehicleDTO v = vehicleService.register(req);
        return ResponseEntity.ok(ApiResponse.ok(v, "Đăng ký xe thành công"));
    }

    // F6.2 - Cập nhật xe. PUT /api/vehicles/{id}
    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<VehicleDTO>> update(
            @PathVariable Long id,
            @Valid @RequestBody UpdateVehicleRequest req) {
        VehicleDTO v = vehicleService.update(id, req);
        return ResponseEntity.ok(ApiResponse.ok(v, "Cập nhật xe thành công"));
    }

    // F6.2 - Huỷ đăng ký xe. DELETE /api/vehicles/{id}
    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<Void>> cancel(@PathVariable Long id) {
        vehicleService.cancel(id);
        return ResponseEntity.ok(ApiResponse.ok(null, "Đã huỷ đăng ký gửi xe"));
    }

    // F6.3 - Admin tra cứu xe theo hộ. GET /api/vehicles/household/{householdId}
    @GetMapping("/household/{householdId}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<PageResponse<VehicleDTO>>> listByHousehold(
            @PathVariable Long householdId,
            @PageableDefault(size = 20, sort = "registeredDate", direction = Sort.Direction.DESC)
            Pageable pageable) {
        return ResponseEntity.ok(
                ApiResponse.ok(vehicleService.listByHousehold(householdId, pageable)));
    }

    // F6.3 - Cư dân xem xe của hộ mình. GET /api/vehicles/my-household
    @GetMapping("/my-household")
    @PreAuthorize("hasRole('RESIDENT')")
    public ResponseEntity<ApiResponse<PageResponse<VehicleDTO>>> listMyHousehold(
            @PageableDefault(size = 20, sort = "registeredDate", direction = Sort.Direction.DESC)
            Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.ok(vehicleService.listMyHousehold(pageable)));
    }
}
