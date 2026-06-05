package org.example.backend.repository;

import org.example.backend.entity.PaymentTransaction;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Truy vấn giao dịch VNPay phục vụ báo cáo giao dịch online (FR-24, M5 + M10).
 * Lọc tuỳ chọn theo trạng thái và khoảng thời gian tạo giao dịch.
 */
@Repository
public interface ReportTransactionRepository extends JpaRepository<PaymentTransaction, Long> {

    @Query("""
            SELECT t FROM PaymentTransaction t
            JOIN FETCH t.household h
            JOIN FETCH t.user u
            WHERE (:status IS NULL OR t.status = :status)
              AND (:from   IS NULL OR t.createdAt >= :from)
              AND (:to     IS NULL OR t.createdAt <= :to)
            ORDER BY t.createdAt DESC
            """)
    List<PaymentTransaction> findForReport(@Param("status") String status,
                                           @Param("from") LocalDateTime from,
                                           @Param("to") LocalDateTime to);
}
