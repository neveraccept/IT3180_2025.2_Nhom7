package org.example.backend.entity;

import org.example.backend.entity.enums.ComplaintCategory;
import org.example.backend.entity.enums.ComplaintStatus;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;
import java.util.Objects;

@Entity
@Table(name = "complaints",
        indexes = {
                @Index(name = "idx_complaint_sender", columnList = "sender_user_id"),
                @Index(name = "idx_complaint_status", columnList = "status")
        })
@Getter
@Setter
@NoArgsConstructor
public class Complaint {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** Tài khoản cư dân đã gửi khiếu nại. Đây là "chủ" khiếu nại để kiểm tra quyền xem. */
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "sender_user_id", nullable = false,
            foreignKey = @ForeignKey(name = "fk_complaint_sender"))
    private User sender;

    /** Hộ của người gửi tại thời điểm gửi (snapshot tham chiếu). */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "household_id",
            foreignKey = @ForeignKey(name = "fk_complaint_household"))
    private Household household;

    @Column(name = "title", nullable = false, length = 200)
    private String title;

    @Enumerated(EnumType.STRING)
    @Column(name = "category", length = 30)
    private ComplaintCategory category;

    @Column(name = "content", columnDefinition = "TEXT")
    private String content;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    private ComplaintStatus status = ComplaintStatus.NEW;

    @Column(name = "response", columnDefinition = "TEXT")
    private String response;

    /** Admin đã xử lý / phản hồi. */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "handled_by",
            foreignKey = @ForeignKey(name = "fk_complaint_handled_by"))
    private User handledBy;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "responded_at")
    private LocalDateTime respondedAt;

    @PrePersist
    void onCreate() {
        if (createdAt == null) createdAt = LocalDateTime.now();
        if (status == null) status = ComplaintStatus.NEW;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof Complaint that)) return false;
        return id != null && Objects.equals(id, that.id);
    }

    @Override
    public int hashCode() {
        return getClass().hashCode();
    }
}