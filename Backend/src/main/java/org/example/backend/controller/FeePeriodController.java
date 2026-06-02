package org.example.backend.controller;

import org.example.backend.dto.FeePeriodDTO;
import org.example.backend.service.FeePeriodService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/fee-periods")
public class FeePeriodController {

    @Autowired
    private FeePeriodService feePeriodService;

    @PreAuthorize("hasAuthority('ADMIN')")
    @GetMapping
    public ResponseEntity<?> getAllFeePeriods(Pageable pageable) {
        return ResponseEntity.ok(feePeriodService.getAllFeePeriods(pageable));
    }

    @PreAuthorize("hasAuthority('ADMIN')")
    @GetMapping("/{id}")
    public ResponseEntity<?> getFeePeriodById(@PathVariable Long id) {
        return ResponseEntity.ok(feePeriodService.getFeePeriodById(id));
    }

    @PreAuthorize("hasAuthority('ADMIN')")
    @PostMapping
    public ResponseEntity<?> createFeePeriod(@RequestBody FeePeriodDTO feePeriodDTO) {
        return ResponseEntity.ok(feePeriodService.createFeePeriod(feePeriodDTO));
    }

    @PreAuthorize("hasAuthority('ADMIN')")
    @PutMapping("/{id}")
    public ResponseEntity<?> updateFeePeriod(@PathVariable Long id, @RequestBody FeePeriodDTO feePeriodDTO) {
        return ResponseEntity.ok(feePeriodService.updateFeePeriod(id, feePeriodDTO));
    }

    @PreAuthorize("hasAuthority('ADMIN')")
    @PutMapping("/{id}/close")
    public ResponseEntity<?> closeFeePeriod(@PathVariable Long id) {
        feePeriodService.closeFeePeriod(id);
        return ResponseEntity.ok().build();
    }
}
