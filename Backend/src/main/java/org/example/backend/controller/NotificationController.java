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

    // Admin soạn và gửi thông báo
    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<NotificationDTO>> create(
            @Valid @RequestBody NotificationCreateRequest req) {
        NotificationDTO created = notificationService.create(req);
        return ResponseEntity.ok(ApiResponse.ok(created,
                "Đã gửi thông báo tới " + created.recipientCount() + " người nhận"));
    }

    // Xem thông báo gửi cho user hiện tại
    @GetMapping("/my")
    @PreAuthorize("hasAnyRole('ADMIN', 'RESIDENT')")
    public ResponseEntity<ApiResponse<PageResponse<NotificationDTO>>> myNotifications(
            @PageableDefault(size = 20, sort = "id", direction = Sort.Direction.DESC)
            Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.ok(
                notificationService.getMyNotifications(pageable)));
    }

    // F9.1 - Admin xem lại danh sách thông báo mình đã gửi (kèm số người nhận)
    @GetMapping("/sent")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<PageResponse<NotificationDTO>>> sentNotifications(
            @PageableDefault(size = 20, sort = "id", direction = Sort.Direction.DESC)
            Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.ok(
                notificationService.getSentNotifications(pageable)));
    }

    // F9.4 - Đánh dấu thông báo đã đọc
    @PutMapping("/{id}/read")
    @PreAuthorize("hasAnyRole('ADMIN', 'RESIDENT')")
    public ResponseEntity<ApiResponse<NotificationDTO>> markAsRead(@PathVariable Long id) {
        NotificationDTO dto = notificationService.markAsRead(id);
        return ResponseEntity.ok(ApiResponse.ok(dto, "Đã đánh dấu đã đọc"));
    }
}