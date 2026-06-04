package org.example.backend.repository;

import org.example.backend.entity.ParkingRegistration;
import org.example.backend.entity.enums.ParkingRegistrationStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface ParkingRegistrationRepository extends JpaRepository<ParkingRegistration, Long> {

    boolean existsBySlotIdAndStatus(Long slotId, ParkingRegistrationStatus status);

    // Lượt đăng ký đang ACTIVE của một xe (để huỷ khi xoá xe).
    Optional<ParkingRegistration> findByVehicleIdAndStatus(Long vehicleId,
                                                           ParkingRegistrationStatus status);

    // Cư dân xem các lượt gửi xe ACTIVE của hộ mình.
    Page<ParkingRegistration> findByVehicleHouseholdIdAndStatus(Long householdId,
                                                                ParkingRegistrationStatus status,
                                                                Pageable pageable);
}
