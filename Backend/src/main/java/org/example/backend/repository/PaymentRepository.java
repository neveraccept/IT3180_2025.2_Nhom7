package org.example.backend.repository;

import org.example.backend.entity.Payment;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface PaymentRepository extends JpaRepository<Payment, Long> {

    // Fetch-join các quan hệ to-one mà PaymentDetailDTO.from(...) sẽ đọc
    // (feePeriod, feePeriod.fee, household, collectedBy) để tránh N+1 khi map sang DTO.
    @Query(value = """
            SELECT p FROM Payment p
            LEFT JOIN FETCH p.feePeriod fp
            LEFT JOIN FETCH fp.fee
            LEFT JOIN FETCH p.household
            LEFT JOIN FETCH p.collectedBy
            WHERE p.household.id = :householdId
            """,
            countQuery = "SELECT COUNT(p) FROM Payment p WHERE p.household.id = :householdId")
    Page<Payment> findByHousehold_Id(@Param("householdId") Long householdId, Pageable pageable);

    Page<Payment> findByFeePeriod_Id(Long feePeriodId, Pageable pageable);

    /** Số phiếu thu đã sinh cho một đợt thu — dùng để backfill những đợt chưa có phiếu. */
    long countByFeePeriod_Id(Long feePeriodId);

    @Query(value = """
            SELECT p FROM Payment p
            LEFT JOIN FETCH p.feePeriod fp
            LEFT JOIN FETCH fp.fee
            LEFT JOIN FETCH p.household
            LEFT JOIN FETCH p.collectedBy
            WHERE (:householdId IS NULL OR p.household.id = :householdId)
              AND (:status IS NULL OR p.status = :status)
            """,
            countQuery = """
            SELECT COUNT(p) FROM Payment p
            WHERE (:householdId IS NULL OR p.household.id = :householdId)
              AND (:status IS NULL OR p.status = :status)
            """)
    Page<Payment> search(@Param("householdId") Long householdId,
                         @Param("status") String status,
                         Pageable pageable);
}

