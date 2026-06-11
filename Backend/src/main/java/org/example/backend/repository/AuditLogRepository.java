package org.example.backend.repository;

import org.example.backend.entity.AuditLog;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface AuditLogRepository extends JpaRepository<AuditLog, Long> {
    // Phân trang dùng findAll(Pageable) sẵn có của JpaRepository; sắp xếp do Pageable quyết định.

    // Chỉ lấy nhật ký thao tác của Admin: loại trừ các bản ghi "SYSTEM" cũ còn sót trong DB
    // (từ trước khi aspect ngừng ghi log cho thao tác hệ thống).
    Page<AuditLog> findByAdminUsernameNot(String adminUsername, Pageable pageable);
}
