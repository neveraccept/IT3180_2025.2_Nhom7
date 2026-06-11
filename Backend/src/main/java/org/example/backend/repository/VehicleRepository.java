package org.example.backend.repository;

import org.example.backend.entity.Vehicle;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface VehicleRepository extends JpaRepository<Vehicle, Long> {

    boolean existsByLicensePlate(String licensePlate);

    // F6.3 – Tra cứu xe theo hộ.
    Page<Vehicle> findByHouseholdId(Long householdId, Pageable pageable);
}
