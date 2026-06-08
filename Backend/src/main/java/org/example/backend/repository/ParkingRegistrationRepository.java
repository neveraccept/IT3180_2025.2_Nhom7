package org.example.backend.repository;

import org.example.backend.entity.ParkingRegistration;
import org.example.backend.entity.enums.ParkingRegistrationStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;
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

    /**
     * Tải hàng loạt các lượt đăng ký ACTIVE cho một tập chỗ gửi,
     * đồng thời JOIN FETCH slot + vehicle để tránh N+1 query.
     * Dùng bởi ParkingService.listSlots() để enrich ParkingSlotDTO
     * với licensePlate và householdCode.
     */
    @Query("SELECT r FROM ParkingRegistration r " +
           "JOIN FETCH r.slot " +
           "LEFT JOIN FETCH r.vehicle " +
           "WHERE r.slot.id IN :slotIds AND r.status = :status")
    List<ParkingRegistration> findBySlotIdsAndStatusWithDetails(
            @Param("slotIds") Collection<Long> slotIds,
            @Param("status") ParkingRegistrationStatus status);

    /**
     * Các lượt gửi xe của HỘ (vehicle != null) theo trạng thái, JOIN FETCH xe + hộ sở hữu.
     * Dùng để sinh hoá đơn phí gửi xe: gom theo hộ và cộng dồn monthlyFee.
     * Lượt cho người ngoài thuê (vehicle = null) không gắn với hộ nên bị loại.
     */
    @Query("SELECT r FROM ParkingRegistration r " +
           "JOIN FETCH r.vehicle v " +
           "JOIN FETCH v.household " +
           "WHERE r.status = :status")
    List<ParkingRegistration> findActiveHouseholdRegistrations(
            @Param("status") ParkingRegistrationStatus status);
}
