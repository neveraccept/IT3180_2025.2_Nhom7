package org.example.backend.repository;

import org.example.backend.entity.Complaint;
import org.example.backend.entity.enums.ComplaintCategory;
import org.example.backend.entity.enums.ComplaintStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface ComplaintRepository extends JpaRepository<Complaint, Long> {

    /** F8.1/Cư dân: chỉ lấy khiếu nại do chính mình gửi. */
    Page<Complaint> findBySenderId(Long senderId, Pageable pageable);

    /** F8.2 – Admin: danh sách + lọc tuỳ chọn theo status / category. */
    @Query("""
            SELECT c FROM Complaint c
            WHERE (:status IS NULL OR c.status = :status)
              AND (:category IS NULL OR c.category = :category)
            """)
    Page<Complaint> search(@Param("status") ComplaintStatus status,
                           @Param("category") ComplaintCategory category,
                           Pageable pageable);
}