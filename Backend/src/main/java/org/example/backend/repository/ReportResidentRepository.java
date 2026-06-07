package org.example.backend.repository;

import org.example.backend.entity.Resident;
import org.example.backend.entity.enums.Gender;
import org.example.backend.entity.enums.ResidencyStatus;
import org.example.backend.entity.enums.ResidentStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

/**
 * Truy vấn đếm phục vụ thống kê dân cư (F10.4).
 *
 * Resident không có cột ngày tạo riêng, nên bộ lọc thời gian dùng ngày chuyển vào
 * của hộ (household.moveInDate) làm mốc "ngày ghi nhận" nhân khẩu.
 */
@Repository
public interface ReportResidentRepository extends JpaRepository<Resident, Long> {

    long countByStatus(ResidentStatus status);

    long countByStatusAndResidencyStatus(ResidentStatus status, ResidencyStatus residencyStatus);

    long countByStatusAndGender(ResidentStatus status, Gender gender);

    @Query("""
            SELECT COUNT(r) FROM Resident r
            WHERE r.status = :status
              AND (:from IS NULL OR r.household.moveInDate >= :from)
              AND (:to IS NULL OR r.household.moveInDate <= :to)
            """)
    long countByStatusInRange(@Param("status") ResidentStatus status,
                              @Param("from") LocalDate from,
                              @Param("to") LocalDate to);

    @Query("""
            SELECT COUNT(r) FROM Resident r
            WHERE r.status = :status
              AND r.residencyStatus = :residencyStatus
              AND (:from IS NULL OR r.household.moveInDate >= :from)
              AND (:to IS NULL OR r.household.moveInDate <= :to)
            """)
    long countByStatusAndResidencyStatusInRange(@Param("status") ResidentStatus status,
                                                @Param("residencyStatus") ResidencyStatus residencyStatus,
                                                @Param("from") LocalDate from,
                                                @Param("to") LocalDate to);

    @Query("""
            SELECT COUNT(r) FROM Resident r
            WHERE r.status = :status
              AND r.gender = :gender
              AND (:from IS NULL OR r.household.moveInDate >= :from)
              AND (:to IS NULL OR r.household.moveInDate <= :to)
            """)
    long countByStatusAndGenderInRange(@Param("status") ResidentStatus status,
                                       @Param("gender") Gender gender,
                                       @Param("from") LocalDate from,
                                       @Param("to") LocalDate to);

    /**
     * Danh sách chi tiết toàn bộ nhân khẩu theo trạng thái (mặc định ACTIVE) phục vụ
     * xuất Excel thống kê dân cư dạng chi tiết. JOIN FETCH hộ + căn hộ để mapper đọc
     * mã căn hộ mà không phát sinh truy vấn lazy ngoài transaction.
     * Bộ lọc thời gian dùng ngày chuyển vào của hộ (household.moveInDate) làm mốc.
     */
    @Query("""
            SELECT r FROM Resident r
            JOIN FETCH r.household h
            JOIN FETCH h.apartment a
            WHERE r.status = :status
              AND (:from IS NULL OR h.moveInDate >= :from)
              AND (:to IS NULL OR h.moveInDate <= :to)
            ORDER BY a.code ASC, r.fullName ASC
            """)
    List<Resident> findDetailedByStatusInRange(@Param("status") ResidentStatus status,
                                               @Param("from") LocalDate from,
                                               @Param("to") LocalDate to);
}
