package org.example.backend.controller;

import org.example.backend.dto.response.ApiResponse;
import org.example.backend.dto.response.PageResponse;
import org.example.backend.dto.ParkingRegistrationDTO;
import org.example.backend.dto.ParkingSlotDTO;
import org.example.backend.dto.ParkingSummaryDTO;
import org.example.backend.dto.request.CreateParkingRegistrationRequest;
import org.example.backend.service.ParkingService;
import jakarta.validation.Valid;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

/**
 * M6 â€“ Quáº£n lÃ½ chá»— gá»­i xe vÃ  lÆ°á»£t Ä‘Äƒng kÃ½/cho thuÃª.
 * Admin: F6.4 (xem tÃ¬nh tráº¡ng chá»—), F6.1 gÃ¡n xe vÃ o chá»—, F6.5 cho thuÃª chá»— thá»«a, káº¿t thÃºc lÆ°á»£t.
 * CÆ° dÃ¢n: xem cÃ¡c lÆ°á»£t gá»­i xe Ä‘ang hiá»‡u lá»±c cá»§a há»™ mÃ¬nh.
 */
@RestController
@RequestMapping("/api")
public class ParkingController {

    private final ParkingService parkingService;

    public ParkingController(ParkingService parkingService) {
        this.parkingService = parkingService;
    }

    // F6.4 â€“ Danh sÃ¡ch chá»— gá»­i. GET /api/parking-slots
    @GetMapping("/parking-slots")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<PageResponse<ParkingSlotDTO>>> listSlots(
            @PageableDefault(size = 20, sort = "code", direction = Sort.Direction.ASC)
            Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.ok(parkingService.listSlots(pageable)));
    }

    // F6.4 â€“ TÃ¬nh tráº¡ng chá»— gá»­i (tá»•ng/Ä‘Ã£ dÃ¹ng/cho thuÃª/cÃ²n trá»‘ng).
    // GET /api/parking-slots/summary
    @GetMapping("/parking-slots/summary")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<ParkingSummaryDTO>> summary() {
        return ResponseEntity.ok(ApiResponse.ok(parkingService.summary()));
    }

    // F6.1 (gÃ¡n xe há»™) + F6.5 (cho thuÃª chá»— thá»«a). POST /api/parking-registrations
    @PostMapping("/parking-registrations")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<ParkingRegistrationDTO>> createRegistration(
            @Valid @RequestBody CreateParkingRegistrationRequest req) {
        ParkingRegistrationDTO dto = parkingService.createRegistration(req);
        return ResponseEntity.ok(ApiResponse.ok(dto, "ÄÄƒng kÃ½ chá»— gá»­i xe thÃ nh cÃ´ng"));
    }

    // F6.2 / F6.5 â€“ Káº¿t thÃºc lÆ°á»£t Ä‘Äƒng kÃ½. PUT /api/parking-registrations/{id}/end
    @PutMapping("/parking-registrations/{id}/end")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<ParkingRegistrationDTO>> endRegistration(
            @PathVariable Long id) {
        ParkingRegistrationDTO dto = parkingService.endRegistration(id);
        return ResponseEntity.ok(ApiResponse.ok(dto, "ÄÃ£ káº¿t thÃºc lÆ°á»£t gá»­i xe"));
    }

    // CÆ° dÃ¢n xem lÆ°á»£t gá»­i xe cá»§a há»™. GET /api/parking-registrations/my-household
    @GetMapping("/parking-registrations/my-household")
    @PreAuthorize("hasRole('RESIDENT')")
    public ResponseEntity<ApiResponse<PageResponse<ParkingRegistrationDTO>>> myHousehold(
            @PageableDefault(size = 20, sort = "startDate", direction = Sort.Direction.DESC)
            Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.ok(parkingService.listMyHousehold(pageable)));
    }
}
