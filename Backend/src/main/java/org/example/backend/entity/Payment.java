package org.example.backend.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "payments",
        uniqueConstraints = @UniqueConstraint(
                name = "uk_payment_period_household",
                columnNames = {"fee_period_id", "household_id"}))
@Getter
@Setter
@NoArgsConstructor
public class Payment {

    public static final String STATUS_UNPAID = "UNPAID";
    public static final String STATUS_PAID   = "PAID";
    public static final String METHOD_CASH   = "CASH";
    public static final String METHOD_ONLINE = "ONLINE";

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "fee_period_id", nullable = false,
            foreignKey = @ForeignKey(name = "fk_payment_fee_period"))
    private FeePeriod feePeriod;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "household_id", nullable = false,
            foreignKey = @ForeignKey(name = "fk_payment_household"))
    private Household household;

    @Column(name = "amount_due", nullable = false, precision = 15, scale = 2)
    private BigDecimal amountDue;

    @Column(name = "amount_paid", nullable = false, precision = 15, scale = 2)
    private BigDecimal amountPaid = BigDecimal.ZERO;

    @Column(name = "paid_date")
    private LocalDate paidDate;

    @Column(name = "status", nullable = false, length = 20)
    private String status = STATUS_UNPAID;

    /** CASH / ONLINE; NULL khi chưa thanh toán. */
    @Column(name = "payment_method", length = 20)
    private String paymentMethod;

    /** Mã giao dịch online, chỉ có giá trị khi payment_method = ONLINE. */
    @Column(name = "transaction_code", length = 50)
    private String transactionCode;

    @Column(name = "paid_at")
    private LocalDateTime paidAt;

    @Column(name = "note", columnDefinition = "TEXT")
    private String note;

    /** Admin xác nhận tiền mặt; NULL nếu thanh toán online. */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "collected_by",
            foreignKey = @ForeignKey(name = "fk_payment_collected_by"))
    private User collectedBy;
}
