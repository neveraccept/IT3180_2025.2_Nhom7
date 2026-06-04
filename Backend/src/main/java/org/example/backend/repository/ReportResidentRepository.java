package org.example.backend.repository;

import org.example.backend.entity.Resident;
import org.example.backend.entity.enums.Gender;
import org.example.backend.entity.enums.ResidencyStatus;
import org.example.backend.entity.enums.ResidentStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

/**
 * Truy vấn đếm phục vụ thống kê dân cư (F10.4).
 */
@Repository
public interface ReportResidentRepository extends JpaRepository<Resident, Long> {

    long countByStatus(ResidentStatus status);

    long countByStatusAndResidencyStatus(ResidentStatus status, ResidencyStatus residencyStatus);

    long countByStatusAndGender(ResidentStatus status, Gender gender);
}
