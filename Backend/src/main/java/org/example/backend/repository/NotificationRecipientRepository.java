package org.example.backend.repository;

import org.example.backend.entity.NotificationRecipient;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface NotificationRecipientRepository
        extends JpaRepository<NotificationRecipient, Long> {

    /** F9.3 – thông báo gửi tới chính user hiện tại. */
    Page<NotificationRecipient> findByRecipientId(Long recipientId, Pageable pageable);

    /** F9.4 – tìm đúng bản ghi nhận của user cho 1 notification (để đánh dấu đã đọc). */
    Optional<NotificationRecipient> findByNotificationIdAndRecipientId(
            Long notificationId, Long recipientId);
}