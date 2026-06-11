package org.example.backend.repository;

import org.example.backend.entity.Household;
import org.example.backend.entity.enums.HouseholdStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;

/**
 * Đếm số hộ theo trạng thái (phục vụ F10.4).
 */
@Repository
public interface ReportHouseholdRepository extends JpaRepository<Household, Long> {

    // Đếm số hộ theo trạng thái, lọc theo ngày chuyển vào [from, to] (null = không giới hạn).
    @Query("""
            SELECT COUNT(h) FROM Household h
            WHERE h.status = :status
              AND (:from IS NULL OR h.moveInDate >= :from)
              AND (:to IS NULL OR h.moveInDate <= :to)
            """)
    long countByStatusInRange(@Param("status") HouseholdStatus status,
                              @Param("from") LocalDate from,
                              @Param("to") LocalDate to);
}
