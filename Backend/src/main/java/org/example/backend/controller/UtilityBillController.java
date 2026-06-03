package org.example.backend.controller;

import org.example.backend.dto.response.ApiResponse;
import org.example.backend.dto.response.PageResponse;
import org.example.backend.dto.UtilityBillDTO;
import org.example.backend.dto.request.CreateUtilityBillRequest;
import org.example.backend.dto.request.UpdateUtilityBillRequest;
import org.example.backend.entity.enums.UtilityBillStatus;
import org.example.backend.entity.enums.UtilityType;
import org.example.backend.service.UtilityBillService;
import jakarta.validation.Valid;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

/**
 * M7 â€“ Quáº£n lÃ½ hoÃ¡ Ä‘Æ¡n Ä‘iá»‡n/nÆ°á»›c/internet.
 * Admin: nháº­p (F7.1), sá»­a/xoÃ¡ (F7.2), xÃ¡c nháº­n Ä‘Ã£ ná»™p tiá»n máº·t (F7.3), tra cá»©u (F7.4).
 * CÆ° dÃ¢n: chá»‰ tra cá»©u hoÃ¡ Ä‘Æ¡n cá»§a há»™ mÃ¬nh.
 *
 * LÆ°u Ã½ route: endpoint xÃ¡c nháº­n tiá»n máº·t náº±m dÆ°á»›i /api/admin/... theo SDD,
 * nÃªn controller dÃ¹ng /api lÃ m prefix vÃ  chá»‰ Ä‘á»‹nh path tuyá»‡t Ä‘á»‘i á»Ÿ tá»«ng method.
 */
@RestController
@RequestMapping("/api")
public class UtilityBillController {

    private final UtilityBillService utilityBillService;

    public UtilityBillController(UtilityBillService utilityBillService) {
        this.utilityBillService = utilityBillService;
    }

    // F7.1 â€“ Nháº­p hoÃ¡ Ä‘Æ¡n. POST /api/utility-bills
    @PostMapping("/utility-bills")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<UtilityBillDTO>> create(
            @Valid @RequestBody CreateUtilityBillRequest req) {
        UtilityBillDTO dto = utilityBillService.create(req);
        return ResponseEntity.ok(ApiResponse.ok(dto, "Táº¡o hoÃ¡ Ä‘Æ¡n thÃ nh cÃ´ng"));
    }

    // F7.2 â€“ Sá»­a hoÃ¡ Ä‘Æ¡n. PUT /api/utility-bills/{id}
    @PutMapping("/utility-bills/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<UtilityBillDTO>> update(
            @PathVariable Long id,
            @Valid @RequestBody UpdateUtilityBillRequest req) {
        UtilityBillDTO dto = utilityBillService.update(id, req);
        return ResponseEntity.ok(ApiResponse.ok(dto, "Cáº­p nháº­t hoÃ¡ Ä‘Æ¡n thÃ nh cÃ´ng"));
    }

    // F7.2 â€“ XoÃ¡ hoÃ¡ Ä‘Æ¡n. DELETE /api/utility-bills/{id}
    @DeleteMapping("/utility-bills/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable Long id) {
        utilityBillService.delete(id);
        return ResponseEntity.ok(ApiResponse.ok(null, "ÄÃ£ xoÃ¡ hoÃ¡ Ä‘Æ¡n"));
    }

    // F7.3 â€“ Ghi nháº­n Ä‘Ã£ ná»™p tiá»n máº·t. PUT /api/admin/utility-bills/{id}/confirm-cash
    @PutMapping("/admin/utility-bills/{id}/confirm-cash")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<UtilityBillDTO>> confirmCash(@PathVariable Long id) {
        UtilityBillDTO dto = utilityBillService.confirmCash(id);
        return ResponseEntity.ok(ApiResponse.ok(dto, "ÄÃ£ ghi nháº­n ná»™p tiá»n máº·t"));
    }

    // F7.4 â€“ Admin tra cá»©u hoÃ¡ Ä‘Æ¡n (lá»c theo há»™/loáº¡i/thÃ¡ng/nÄƒm/tráº¡ng thÃ¡i).
    // GET /api/utility-bills?householdId=&type=&month=&year=&status=
    @GetMapping("/utility-bills")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<PageResponse<UtilityBillDTO>>> search(
            @RequestParam(required = false) Long householdId,
            @RequestParam(required = false) UtilityType type,
            @RequestParam(required = false) Integer month,
            @RequestParam(required = false) Integer year,
            @RequestParam(required = false) UtilityBillStatus status,
            @PageableDefault(size = 20, sort = {"year", "month"}, direction = Sort.Direction.DESC)
            Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.ok(
                utilityBillService.search(householdId, type, month, year, status, pageable)));
    }

    // F7.4 â€“ Admin xem chi tiáº¿t hoÃ¡ Ä‘Æ¡n. GET /api/utility-bills/{id}
    @GetMapping("/utility-bills/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<UtilityBillDTO>> getDetail(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(utilityBillService.getDetail(id)));
    }

    // F7.4 â€“ CÆ° dÃ¢n xem hoÃ¡ Ä‘Æ¡n cá»§a há»™ mÃ¬nh. GET /api/utility-bills/my-household
    @GetMapping("/utility-bills/my-household")
    @PreAuthorize("hasRole('RESIDENT')")
    public ResponseEntity<ApiResponse<PageResponse<UtilityBillDTO>>> myHousehold(
            @RequestParam(required = false) UtilityType type,
            @RequestParam(required = false) Integer month,
            @RequestParam(required = false) Integer year,
            @RequestParam(required = false) UtilityBillStatus status,
            @PageableDefault(size = 20, sort = {"year", "month"}, direction = Sort.Direction.DESC)
            Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.ok(
                utilityBillService.listMyHousehold(type, month, year, status, pageable)));
    }
}
