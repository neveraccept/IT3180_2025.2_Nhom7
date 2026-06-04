package org.example.backend.repository;

import org.example.backend.entity.Household;
import org.example.backend.entity.enums.HouseholdStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

/**
 * Đếm số hộ theo trạng thái (phục vụ F10.4).
 */
@Repository
public interface ReportHouseholdRepository extends JpaRepository<Household, Long> {

    long countByStatus(HouseholdStatus status);
}
