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

    Page<Payment> findByHousehold_Id(Long householdId, Pageable pageable);

    Page<Payment> findByFeePeriod_Id(Long feePeriodId, Pageable pageable);

    @Query("""
            SELECT p FROM Payment p
            WHERE (:householdId IS NULL OR p.household.id = :householdId)
              AND (:status IS NULL OR p.status = :status)
            """)
    Page<Payment> search(@Param("householdId") Long householdId,
                         @Param("status") String status,
                         Pageable pageable);
}

