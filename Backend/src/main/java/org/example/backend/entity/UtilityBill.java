package org.example.backend.entity;

import org.example.backend.entity.enums.PaymentMethod;
import org.example.backend.entity.enums.UtilityBillStatus;
import org.example.backend.entity.enums.UtilityType;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Objects;

/**
 * Hoá đơn điện/nước/internet của một hộ theo tháng. Bảng `utility_bills`.
 * Ràng buộc UNIQUE(household_id, type, month, year) – mỗi hộ chỉ một hoá đơn/loại/tháng.
 */
@Entity
@Table(name = "utility_bills",
        uniqueConstraints = @UniqueConstraint(
                name = "uk_utility_household_type_month_year",
                columnNames = {"household_id", "type", "month", "year"}))
@Getter
@Setter
@NoArgsConstructor
public class UtilityBill {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "household_id", nullable = false,
            foreignKey = @ForeignKey(name = "fk_utility_household"))
    private Household household;

    @Enumerated(EnumType.STRING)
    @Column(name = "type", nullable = false, length = 20)
    private UtilityType type;

    @Column(name = "month", nullable = false)
    private Integer month;

    @Column(name = "year", nullable = false)
    private Integer year;

    /** Chỉ số đồng hồ kỳ trước (điện/nước). NULL với hoá đơn INTERNET. */
    @Column(name = "old_index")
    private Integer oldIndex;

    /** Chỉ số đồng hồ kỳ này (điện/nước). NULL với hoá đơn INTERNET. */
    @Column(name = "new_index")
    private Integer newIndex;

    @Column(name = "amount", nullable = false, precision = 15, scale = 2)
    private BigDecimal amount;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    private UtilityBillStatus status = UtilityBillStatus.UNPAID;

    @Column(name = "paid_date")
    private LocalDate paidDate;

    /** NULL khi chưa thanh toán; CASH (F7.3) hoặc ONLINE (VNPay). */
    @Enumerated(EnumType.STRING)
    @Column(name = "payment_method", length = 20)
    private PaymentMethod paymentMethod;

    /** Mã giao dịch online (nếu thanh toán qua VNPay). */
    @Column(name = "transaction_code", length = 50)
    private String transactionCode;

    @Column(name = "paid_at")
    private LocalDateTime paidAt;

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof UtilityBill that)) return false;
        return id != null && Objects.equals(id, that.id);
    }

    @Override
    public int hashCode() {
        return getClass().hashCode();
    }
}
