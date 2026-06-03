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
 * M6 â€“ Quáº£n lÃ½ phÆ°Æ¡ng tiá»‡n cá»§a há»™ dÃ¢n.
 * Admin: Ä‘Äƒng kÃ½ / cáº­p nháº­t / huá»· / tra cá»©u theo há»™.
 * CÆ° dÃ¢n: chá»‰ xem xe cá»§a há»™ mÃ¬nh.
 */
@RestController
@RequestMapping("/api/vehicles")
public class VehicleController {

    private final VehicleService vehicleService;

    public VehicleController(VehicleService vehicleService) {
        this.vehicleService = vehicleService;
    }

    // F6.1 â€“ ÄÄƒng kÃ½ xe cho há»™. POST /api/vehicles
    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<VehicleDTO>> register(
            @Valid @RequestBody RegisterVehicleRequest req) {
        VehicleDTO v = vehicleService.register(req);
        return ResponseEntity.ok(ApiResponse.ok(v, "ÄÄƒng kÃ½ xe thÃ nh cÃ´ng"));
    }

    // F6.2 â€“ Cáº­p nháº­t xe. PUT /api/vehicles/{id}
    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<VehicleDTO>> update(
            @PathVariable Long id,
            @Valid @RequestBody UpdateVehicleRequest req) {
        VehicleDTO v = vehicleService.update(id, req);
        return ResponseEntity.ok(ApiResponse.ok(v, "Cáº­p nháº­t xe thÃ nh cÃ´ng"));
    }

    // F6.2 â€“ Huá»· Ä‘Äƒng kÃ½ xe. DELETE /api/vehicles/{id}
    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<Void>> cancel(@PathVariable Long id) {
        vehicleService.cancel(id);
        return ResponseEntity.ok(ApiResponse.ok(null, "ÄÃ£ huá»· Ä‘Äƒng kÃ½ gá»­i xe"));
    }

    // F6.3 â€“ Admin tra cá»©u xe theo há»™. GET /api/vehicles/household/{householdId}
    @GetMapping("/household/{householdId}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<PageResponse<VehicleDTO>>> listByHousehold(
            @PathVariable Long householdId,
            @PageableDefault(size = 20, sort = "registeredDate", direction = Sort.Direction.DESC)
            Pageable pageable) {
        return ResponseEntity.ok(
                ApiResponse.ok(vehicleService.listByHousehold(householdId, pageable)));
    }

    // F6.3 â€“ CÆ° dÃ¢n xem xe cá»§a há»™ mÃ¬nh. GET /api/vehicles/my-household
    @GetMapping("/my-household")
    @PreAuthorize("hasRole('RESIDENT')")
    public ResponseEntity<ApiResponse<PageResponse<VehicleDTO>>> listMyHousehold(
            @PageableDefault(size = 20, sort = "registeredDate", direction = Sort.Direction.DESC)
            Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.ok(vehicleService.listMyHousehold(pageable)));
    }
}
