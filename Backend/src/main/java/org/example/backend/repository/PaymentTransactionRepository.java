package org.example.backend.repository;

import jakarta.persistence.LockModeType;
import org.example.backend.entity.PaymentTransaction;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
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

    Page<PaymentTransaction> findByHousehold_Id(Long householdId, Pageable pageable);

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