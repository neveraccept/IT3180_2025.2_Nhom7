package org.example.backend.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

/**
 * Nhật ký thao tác của Admin: lưu lại ai (adminUsername) đã làm gì (action)
 * trên đối tượng nào (targetEntity) vào thời điểm nào (timestamp).
 */
@Entity
@Table(name = "audit_logs")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AuditLog {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // Username của Admin thực hiện thao tác (lấy từ SecurityContext).
    @Column(name = "admin_username", length = 50)
    private String adminUsername;

    // Loại hành động: CREATE, UPDATE, DELETE.
    @Column(length = 20)
    private String action;

    // Đối tượng bị tác động: User, Complaint, FeePeriod...
    @Column(name = "target_entity", length = 50)
    private String targetEntity;

    // Mô tả chi tiết (ví dụ: "Xóa tài khoản #5", tham số đầu vào...).
    @Column(length = 1000)
    private String details;

    // Thời điểm thực hiện — tự sinh khi lưu.
    @CreationTimestamp
    @Column(name = "timestamp", updatable = false)
    private LocalDateTime timestamp;
}
