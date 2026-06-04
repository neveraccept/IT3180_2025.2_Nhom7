package org.example.backend.dto;

import org.example.backend.entity.enums.NotificationScope;

import java.time.LocalDateTime;

/**
 * Dùng cho cả 2 ngữ cảnh:
 *  - Khi cư dân xem (F9.3/F9.4): isRead/readAt có giá trị, recipientCount = null.
 *  - Khi Admin gửi (F9.1): isRead/readAt = null, recipientCount = số người nhận.
 *  id LUÔN là id của Notification (để khớp endpoint .../{id}/read).
 */
public record NotificationDTO(
        Long id,
        String title,
        String content,
        NotificationScope scope,
        String senderName,
        LocalDateTime sentAt,

        Boolean isRead,
        LocalDateTime readAt,
        
        Integer recipientCount
) {
}