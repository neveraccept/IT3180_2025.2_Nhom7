package org.example.backend.repository;

import org.example.backend.entity.Payment;
import org.example.backend.repository.projection.DonationContributionProjection;
import org.example.backend.repository.projection.HouseholdPaymentProjection;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.util.List;

/**
 * Truy vấn phục vụ thống kê thu phí (M10).
 * Tách riêng khỏi PaymentRepository nghiệp vụ để gom các truy vấn báo cáo một chỗ.
 */
@Repository
public interface ReportPaymentRepository extends JpaRepository<Payment, Long> {

    // ---- F10.1: tình trạng đợt thu ----

    long countByFeePeriodId(Long feePeriodId);

    long countByFeePeriodIdAndStatus(Long feePeriodId, String status);

    @Query("SELECT COALESCE(SUM(p.amountDue), 0) FROM Payment p WHERE p.feePeriod.id = :feePeriodId")
    BigDecimal sumAmountDueByFeePeriod(@Param("feePeriodId") Long feePeriodId);

    @Query("SELECT COALESCE(SUM(p.amountPaid), 0) FROM Payment p WHERE p.feePeriod.id = :feePeriodId")
    BigDecimal sumAmountPaidByFeePeriod(@Param("feePeriodId") Long feePeriodId);

    // ---- F10.2: khoản đóng góp theo đợt (chỉ hộ thực sự đóng góp) ----

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
            WHERE p.feePeriod.id = :feePeriodId
              AND p.amountPaid > 0
            ORDER BY p.paidDate DESC, h.code ASC
            """)
    List<DonationContributionProjection> findContributions(@Param("feePeriodId") Long feePeriodId);

    // ---- F10.3: gộp theo hộ gia đình (toàn bộ phiếu nộp) ----

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
            GROUP BY h.id, h.code, r.fullName, a.code
            ORDER BY h.code ASC
            """)
    List<HouseholdPaymentProjection> aggregateByHousehold();
}
