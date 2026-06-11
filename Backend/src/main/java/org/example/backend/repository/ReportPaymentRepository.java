package org.example.backend.repository;

import org.example.backend.entity.Payment;
import org.example.backend.repository.projection.DonationContributionProjection;
import org.example.backend.repository.projection.HouseholdPaymentProjection;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

/**
 * Truy vấn phục vụ thống kê thu phí (M10).
 * Tách riêng khỏi PaymentRepository nghiệp vụ để gom các truy vấn báo cáo một chỗ.
 */
@Repository
public interface ReportPaymentRepository extends JpaRepository<Payment, Long> {

    // ---- F10.1: tổng hợp theo danh sách feePeriodIds (một hoặc nhiều đợt thu) ----

    @Query("SELECT COUNT(p) FROM Payment p WHERE p.feePeriod.id IN :feePeriodIds")
    long countByFeePeriodIdIn(@Param("feePeriodIds") List<Long> feePeriodIds);

    @Query("SELECT COALESCE(SUM(p.amountDue), 0) FROM Payment p WHERE p.feePeriod.id IN :feePeriodIds")
    BigDecimal sumAmountDueByFeePeriodIn(@Param("feePeriodIds") List<Long> feePeriodIds);

    @Query("""
            SELECT COUNT(p) FROM Payment p
            WHERE p.feePeriod.id IN :feePeriodIds
              AND p.status = 'PAID'
              AND (:from IS NULL OR p.paidDate >= :from)
              AND (:to IS NULL OR p.paidDate <= :to)
            """)
    long countPaidByFeePeriodInRange(@Param("feePeriodIds") List<Long> feePeriodIds,
                                     @Param("from") LocalDate from,
                                     @Param("to") LocalDate to);

    @Query("""
            SELECT COALESCE(SUM(p.amountPaid), 0) FROM Payment p
            WHERE p.feePeriod.id IN :feePeriodIds
              AND (:from IS NULL OR p.paidDate >= :from)
              AND (:to IS NULL OR p.paidDate <= :to)
            """)
    BigDecimal sumAmountPaidByFeePeriodInRange(@Param("feePeriodIds") List<Long> feePeriodIds,
                                               @Param("from") LocalDate from,
                                               @Param("to") LocalDate to);

    // ---- F10.1 (kèm danh sách đóng góp): chi tiết các hộ đã nộp trong (các) đợt thu được chọn ----
    // Liệt kê từng phiếu mà hộ thực sự đã đóng (amount_paid > 0) để xuất kèm trong báo cáo Excel đợt thu.

    @Query("""
            SELECT h.code             AS householdCode,
                   r.fullName         AS headName,
                   a.code             AS apartmentCode,
                   p.amountPaid       AS amount,
                   p.paidDate         AS paidDate
            FROM Payment p
            JOIN p.household h
            JOIN h.apartment a
            LEFT JOIN h.headOfHousehold r
            WHERE p.feePeriod.id IN :feePeriodIds
              AND p.amountPaid > 0
            ORDER BY p.paidDate DESC, h.code ASC
            """)
    List<DonationContributionProjection> findContributionsByFeePeriodIds(@Param("feePeriodIds") List<Long> feePeriodIds);

    // ---- F10.3: gộp theo hộ gia đình, lọc theo khoảng ngày thanh toán [from, to] (null = không giới hạn) ----
    // Chỉ gộp các phiếu có paidDate nằm trong khoảng -> phản ánh số thu trong kỳ.
    @Query("""
            SELECT h.id               AS householdId,
                   h.code             AS householdCode,
                   r.fullName         AS headName,
                   a.code             AS apartmentCode,
                   COALESCE(SUM(p.amountDue), 0)  AS totalDue,
                   COALESCE(SUM(p.amountPaid), 0) AS totalPaid,
                   SUM(CASE WHEN p.status = 'UNPAID' THEN 1 ELSE 0 END) AS unpaidCount,
                   COUNT(p)           AS paymentCount
            FROM Payment p
            JOIN p.household h
            JOIN h.apartment a
            LEFT JOIN h.headOfHousehold r
            WHERE (:from IS NULL OR p.paidDate >= :from)
              AND (:to IS NULL OR p.paidDate <= :to)
            GROUP BY h.id, h.code, r.fullName, a.code
            ORDER BY h.code ASC
            """)
    List<HouseholdPaymentProjection> aggregateByHouseholdInRange(@Param("from") LocalDate from,
                                                                 @Param("to") LocalDate to);
}
