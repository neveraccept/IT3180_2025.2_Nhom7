package org.example.backend.repository;

import org.example.backend.entity.Household;
import org.example.backend.entity.enums.HouseholdStatus;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

@Repository
public interface HouseholdRepository extends JpaRepository<Household, Long> {

    boolean existsByCode(String code);

    // Lấy Household ACTIVE duy nhất của căn hộ (nếu có). Phục vụ F2.5.
    // Fetch sẵn chủ hộ + căn hộ để tránh truy vấn lazy khi map sang DTO.
    @EntityGraph(attributePaths = {"headOfHousehold", "apartment"})
    Optional<Household> findByApartmentIdAndStatus(Long apartmentId, HouseholdStatus status);

    /**
     * Nạp 1 lần các Household theo trạng thái cho NHIỀU căn hộ (tránh N+1 khi liệt kê/tìm kiếm căn hộ).
     * Fetch sẵn chủ hộ để mapper đọc tên chủ hộ không phát sinh truy vấn phụ.
     */
    @EntityGraph(attributePaths = {"headOfHousehold"})
    List<Household> findByApartmentIdInAndStatus(Collection<Long> apartmentIds, HouseholdStatus status);

    boolean existsByApartmentIdAndStatus(Long apartmentId, HouseholdStatus status);

}


