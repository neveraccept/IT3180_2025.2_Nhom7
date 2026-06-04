package org.example.backend.service.mapper;

import org.example.backend.dto.NotificationDTO;
import org.example.backend.entity.Notification;
import org.example.backend.entity.NotificationRecipient;
import org.springframework.stereotype.Component;

@Component
public class NotificationMapper {

    /** Góc nhìn người nhận (F9.3/F9.4): kèm trạng thái đã đọc. */
    public NotificationDTO toRecipientDto(NotificationRecipient nr) {
        Notification n = nr.getNotification();
        return new NotificationDTO(
                n.getId(),
                n.getTitle(),
                n.getContent(),
                n.getScope(),
                n.getSender() != null ? n.getSender().getFullName() : null,
                n.getSentAt(),
                nr.getIsRead(),
                nr.getReadAt(),
                null
        );
    }

    /** Góc nhìn Admin sau khi gửi (F9.1): kèm số người nhận. */
    public NotificationDTO toSentDto(Notification n, int recipientCount) {
        return new NotificationDTO(
                n.getId(),
                n.getTitle(),
                n.getContent(),
                n.getScope(),
                n.getSender() != null ? n.getSender().getFullName() : null,
                n.getSentAt(),
                null,
                null,
                recipientCount
        );
    }
}