package org.example.backend.repository;

import org.example.backend.entity.Notification;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface NotificationRepository extends JpaRepository<Notification, Long> {

    /** Danh sách thông báo do một admin đã soạn/gửi (góc nhìn người gửi). */
    Page<Notification> findBySenderId(Long senderId, Pageable pageable);
}