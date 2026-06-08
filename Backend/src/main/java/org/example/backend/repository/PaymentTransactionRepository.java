package org.example.backend.repository;

import jakarta.persistence.LockModeType;
import org.example.backend.entity.PaymentTransaction;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.Optional;

@Repository
public interface PaymentTransactionRepository extends JpaRepository<PaymentTransaction, Long> {

    Optional<PaymentTransaction> findByTransactionCode(String transactionCode);

    boolean existsByTransactionCode(String transactionCode);

    /** Khoá ghi để xử lý IPN an toàn khi VNPay gọi lặp/đồng thời. */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT t FROM PaymentTransaction t WHERE t.transactionCode = :code")
    Optional<PaymentTransaction> findByTransactionCodeForUpdate(@Param("code") String code);

    /** Tìm giao dịch PENDING đang treo cho cùng một khoản → tránh tạo song song. */
    Optional<PaymentTransaction> findFirstByTargetTypeAndTargetIdAndStatus(
            String targetType, Long targetId, String status);

    @Modifying
    @Query("""
            UPDATE PaymentTransaction t
            SET t.status = :newStatus
            WHERE t.targetType = :targetType
              AND t.targetId IN (
                    SELECT p.id FROM Payment p
                    WHERE p.feePeriod.id = :feePeriodId
                      AND p.status = 'UNPAID'
              )
              AND t.status = :oldStatus
            """)
    int updatePendingFeeTransactionsByFeePeriod(@Param("feePeriodId") Long feePeriodId,
                                                @Param("targetType") String targetType,
                                                @Param("oldStatus") String oldStatus,
                                                @Param("newStatus") String newStatus);

    // Fetch-join household + user mà PaymentTransactionDTO.from(...) sẽ đọc → tránh N+1.
    @EntityGraph(attributePaths = {"household", "user"})
    Page<PaymentTransaction> findByHousehold_Id(Long householdId, Pageable pageable);

    @EntityGraph(attributePaths = {"household", "user"})
    @Query("""
            SELECT t FROM PaymentTransaction t
            WHERE (:status IS NULL OR t.status = :status)
              AND (:householdId IS NULL OR t.household.id = :householdId)
              AND (:targetType IS NULL OR t.targetType = :targetType)
              AND (:from IS NULL OR t.createdAt >= :from)
              AND (:to IS NULL OR t.createdAt <= :to)
            """)
    Page<PaymentTransaction> search(@Param("status") String status,
                                    @Param("householdId") Long householdId,
                                    @Param("targetType") String targetType,
                                    @Param("from") LocalDateTime from,
                                    @Param("to") LocalDateTime to,
                                    Pageable pageable);
}
