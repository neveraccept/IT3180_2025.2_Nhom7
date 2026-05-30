package org.example.backend.repository;

import org.example.backend.entity.Resident;
import org.example.backend.entity.enums.ResidentStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface ResidentRepository extends JpaRepository<Resident, Long> {

    boolean existsByIdCard(String idCard);


    @Modifying
    @Query("""
            UPDATE Resident r
               SET r.status = :newStatus
             WHERE r.household.id = :householdId
               AND r.status = org.example.backend.entity.enums.ResidentStatus.ACTIVE
            """)
    int markAllResidentsMovedOut(@Param("householdId") Long householdId,
                                 @Param("newStatus") ResidentStatus newStatus);
}


