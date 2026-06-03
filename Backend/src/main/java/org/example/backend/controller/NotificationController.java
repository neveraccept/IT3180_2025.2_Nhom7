package org.example.backend.controller;

import org.example.backend.dto.response.ApiResponse;
import org.example.backend.dto.NotificationDTO;
import org.example.backend.dto.response.PageResponse;
import org.example.backend.dto.request.NotificationCreateRequest;
import org.example.backend.service.NotificationService;
import jakarta.validation.Valid;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/notifications")
public class NotificationController {

    private final NotificationService notificationService;

    public NotificationController(NotificationService notificationService) {
        this.notificationService = notificationService;
    }

    // F9.1 + F9.2 â€“ Admin soáº¡n vÃ  gá»­i thÃ´ng bÃ¡o
    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<NotificationDTO>> create(
            @Valid @RequestBody NotificationCreateRequest req) {
        NotificationDTO created = notificationService.create(req);
        return ResponseEntity.ok(ApiResponse.ok(created,
                "ÄÃ£ gá»­i thÃ´ng bÃ¡o tá»›i " + created.recipientCount() + " ngÆ°á»i nháº­n"));
    }

    // F9.3 â€“ Xem thÃ´ng bÃ¡o gá»­i cho user hiá»‡n táº¡i
    @GetMapping("/my")
    @PreAuthorize("hasAnyRole('ADMIN', 'RESIDENT')")
    public ResponseEntity<ApiResponse<PageResponse<NotificationDTO>>> myNotifications(
            @PageableDefault(size = 20, sort = "id", direction = Sort.Direction.DESC)
            Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.ok(
                notificationService.getMyNotifications(pageable)));
    }

    // F9.4 â€“ ÄÃ¡nh dáº¥u thÃ´ng bÃ¡o Ä‘Ã£ Ä‘á»c
    @PutMapping("/{id}/read")
    @PreAuthorize("hasAnyRole('ADMIN', 'RESIDENT')")
    public ResponseEntity<ApiResponse<NotificationDTO>> markAsRead(@PathVariable Long id) {
        NotificationDTO dto = notificationService.markAsRead(id);
        return ResponseEntity.ok(ApiResponse.ok(dto, "ÄÃ£ Ä‘Ã¡nh dáº¥u Ä‘Ã£ Ä‘á»c"));
    }
}