package org.example.backend.controller;

import org.example.backend.dto.FeeDTO;
import org.example.backend.service.FeeService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/fees")
public class FeeController {

    @Autowired
    private FeeService feeService;

    @PreAuthorize("hasRole('ADMIN')")
    @PostMapping
    public ResponseEntity<?> createFee(@RequestBody FeeDTO feeDTO) {
        return ResponseEntity.ok(feeService.createFee(feeDTO));
    }

    @PreAuthorize("hasRole('ADMIN')")
    @PutMapping("/{id}")
    public ResponseEntity<?> updateFee(@PathVariable Long id, @RequestBody FeeDTO feeDTO) {
        return ResponseEntity.ok(feeService.updateFee(id, feeDTO));
    }

    @PreAuthorize("hasRole('ADMIN')")
    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteFee(@PathVariable Long id) {
        feeService.deleteOrDeactivateFee(id);
        return ResponseEntity.ok().build();
    }

    @PreAuthorize("hasRole('ADMIN')")
    @GetMapping
    public ResponseEntity<?> getAllFees(org.springframework.data.domain.Pageable pageable) {
        return ResponseEntity.ok(feeService.getAllFees(pageable));
    }

    @PreAuthorize("hasRole('ADMIN')")
    @GetMapping("/search")
    public ResponseEntity<?> searchFees(@RequestParam(required = false) String keyword,
                                        @RequestParam(required = false) String type,
                                        @RequestParam(required = false) Boolean active,
                                        org.springframework.data.domain.Pageable pageable) {
        return ResponseEntity.ok(feeService.searchFees(keyword, type, active, pageable));
    }

    @PreAuthorize("hasRole('ADMIN')")
    @GetMapping("/{id}")
    public ResponseEntity<?> getFeeById(@PathVariable Long id) {
        return ResponseEntity.ok(feeService.getFeeById(id));
    }
}