package org.example.backend.repository;

import org.example.backend.entity.UtilityBill;
import org.example.backend.entity.enums.UtilityBillStatus;
import org.example.backend.entity.enums.UtilityType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface UtilityBillRepository extends JpaRepository<UtilityBill, Long> {

    boolean existsByHouseholdIdAndTypeAndMonthAndYear(
            Long householdId, UtilityType type, Integer month, Integer year);

    /**
     * Tra cứu hóa đơn có lọc động (F7.4). Tham số null → bỏ qua điều kiện tương ứng.
     * Dùng chung cho cả Admin (truyền householdId) và Cư dân (Service ép householdId của hộ mình).
     */
    // Fetch-join household mà UtilityBillMapper.toDto(...) sẽ đọc → tránh N+1.
    @EntityGraph(attributePaths = {"household"})
    @Query("""
            SELECT b FROM UtilityBill b
            WHERE (:householdId IS NULL OR b.household.id = :householdId)
              AND (:type IS NULL OR b.type = :type)
              AND (:month IS NULL OR b.month = :month)
              AND (:year IS NULL OR b.year = :year)
              AND (:status IS NULL OR b.status = :status)
            """)
    Page<UtilityBill> search(@Param("householdId") Long householdId,
                             @Param("type") UtilityType type,
                             @Param("month") Integer month,
                             @Param("year") Integer year,
                             @Param("status") UtilityBillStatus status,
                             Pageable pageable);
}
