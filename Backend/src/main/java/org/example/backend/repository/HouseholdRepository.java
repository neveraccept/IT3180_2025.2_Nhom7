package org.example.backend.repository;

import org.example.backend.entity.Household;
import org.example.backend.entity.enums.HouseholdStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface HouseholdRepository extends JpaRepository<Household, Long> {

    boolean existsByCode(String code);

    // Lấy Household ACTIVE duy nhất của căn hộ (nếu có). Phục vụ F2.5.
    Optional<Household> findByApartmentIdAndStatus(Long apartmentId, HouseholdStatus status);

    boolean existsByApartmentIdAndStatus(Long apartmentId, HouseholdStatus status);
}


