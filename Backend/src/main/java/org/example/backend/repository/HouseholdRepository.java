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

    // Tra hộ theo mã (phục vụ import hoá đơn điện/nước từ Excel — file tham chiếu hộ bằng mã hộ).
    @EntityGraph(attributePaths = {"apartment"})
    Optional<Household> findByCode(String code);

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

    // Liệt kê hộ theo trạng thái (phục vụ sinh phiếu thu khi tạo đợt thu).
    // Fetch sẵn căn hộ để đọc diện tích khi tính phí theo m² mà không phát sinh truy vấn phụ.
    @EntityGraph(attributePaths = {"apartment"})
    List<Household> findByStatus(HouseholdStatus status);

}


