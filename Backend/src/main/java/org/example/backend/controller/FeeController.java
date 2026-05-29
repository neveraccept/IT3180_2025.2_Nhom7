package org.example.backend.controller;

import org.example.backend.dto.FeeDTO;
import org.example.backend.service.FeeService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
// import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/fees")
public class FeeController {

    @Autowired
    private FeeService feeService;

    // @PreAuthorize("hasAuthority('ADMIN')")
    @PostMapping
    public ResponseEntity<?> createFee(@RequestBody FeeDTO feeDTO) {
        return ResponseEntity.ok(feeService.createFee(feeDTO));
    }

    // @PreAuthorize("hasAuthority('ADMIN')")
    @PutMapping("/{id}")
    public ResponseEntity<?> updateFee(@PathVariable Long id, @RequestBody FeeDTO feeDTO) {
        return ResponseEntity.ok(feeService.updateFee(id, feeDTO));
    }

    // @PreAuthorize("hasAuthority('ADMIN')")
    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteFee(@PathVariable Long id) {
        feeService.deleteOrDeactivateFee(id);
        return ResponseEntity.ok().build();
    }

    // @PreAuthorize("hasAuthority('ADMIN')")
    @GetMapping
    public ResponseEntity<?> getAllFees(org.springframework.data.domain.Pageable pageable) {
        return ResponseEntity.ok(feeService.getAllFees(pageable));
    }

    // @PreAuthorize("hasAuthority('ADMIN')")
    @GetMapping("/search")
    public ResponseEntity<?> searchFees(@RequestParam(required = false) String keyword,
                                        @RequestParam(required = false) String type,
                                        @RequestParam(required = false) Boolean active,
                                        org.springframework.data.domain.Pageable pageable) {
        return ResponseEntity.ok(feeService.searchFees(keyword, type, active, pageable));
    }

    // @PreAuthorize("hasAuthority('ADMIN')")
    @GetMapping("/{id}")
    public ResponseEntity<?> getFeeById(@PathVariable Long id) {
        return ResponseEntity.ok(feeService.getFeeById(id));
    }
}