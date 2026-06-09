package org.example.backend.repository;

import org.example.backend.entity.Notification;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface NotificationRepository extends JpaRepository<Notification, Long> {

    /** Danh sách thông báo do một admin đã soạn/gửi (góc nhìn người gửi). */
    Page<Notification> findBySenderId(Long senderId, Pageable pageable);

    @Query("""
            SELECT DISTINCT n FROM Notification n
            WHERE NOT EXISTS (
                SELECT 1 FROM NotificationRecipient mine
                WHERE mine.notification = n AND mine.recipient.id = :userId
            )
              AND (
                n.scope = org.example.backend.entity.enums.NotificationScope.ALL
                OR (
                    :householdId IS NOT NULL
                    AND n.scope = org.example.backend.entity.enums.NotificationScope.BY_HOUSEHOLD
                    AND EXISTS (
                        SELECT 1 FROM NotificationRecipient nr
                        WHERE nr.notification = n
                          AND nr.recipient.household.id = :householdId
                    )
                )
                OR (
                    :floor IS NOT NULL
                    AND n.scope = org.example.backend.entity.enums.NotificationScope.BY_FLOOR
                    AND EXISTS (
                        SELECT 1 FROM NotificationRecipient nr
                        WHERE nr.notification = n
                          AND nr.recipient.household.apartment.floor = :floor
                    )
                )
              )
            """)
    List<Notification> findMissingApplicableNotificationsForUser(@Param("userId") Long userId,
                                                                 @Param("householdId") Long householdId,
                                                                 @Param("floor") Integer floor);
}
