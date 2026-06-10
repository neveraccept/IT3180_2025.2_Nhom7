package org.example.backend.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "payment_transactions",
        uniqueConstraints = @UniqueConstraint(
                name = "uk_payment_tx_code", columnNames = "transaction_code"),
        indexes = {
                @Index(name = "idx_pt_household", columnList = "household_id"),
                @Index(name = "idx_pt_status", columnList = "status"),
                @Index(name = "idx_pt_target", columnList = "target_type, target_id")
        })
@Getter
@Setter
@NoArgsConstructor
public class PaymentTransaction {

    public static final String STATUS_PENDING   = "PENDING";
    public static final String STATUS_SUCCESS   = "SUCCESS";
    public static final String STATUS_FAILED    = "FAILED";
    public static final String STATUS_CANCELLED = "CANCELLED";

    public static final String TARGET_FEE_PAYMENT  = "FEE_PAYMENT";
    public static final String TARGET_UTILITY_BILL = "UTILITY_BILL";
    public static final String TARGET_FEE_PAYMENT_BATCH = "FEE_PAYMENT_BATCH";
    public static final String TARGET_MIXED_PAYMENT_BATCH = "MIXED_PAYMENT_BATCH";

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "transaction_code", nullable = false, unique = true, length = 50)
    private String transactionCode;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "household_id", nullable = false,
            foreignKey = @ForeignKey(name = "fk_pt_household"))
    private Household household;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false,
            foreignKey = @ForeignKey(name = "fk_pt_user"))
    private User user;

    /** FEE_PAYMENT → payments.id ; UTILITY_BILL → utility_bills.id (liên kết đa hình). */
    @Column(name = "target_type", nullable = false, length = 20)
    private String targetType;

    @Column(name = "target_id", nullable = false)
    private Long targetId;

    @Column(name = "target_ids", columnDefinition = "TEXT")
    private String targetIds;

    @Column(name = "target_amounts", columnDefinition = "TEXT")
    private String targetAmounts;

    @Column(name = "utility_bill_ids", columnDefinition = "TEXT")
    private String utilityBillIds;

    @Column(name = "amount", nullable = false, precision = 15, scale = 2)
    private BigDecimal amount;

    @Column(name = "status", nullable = false, length = 20)
    private String status = STATUS_PENDING;

    @Column(name = "vnpay_transaction_no", length = 100)
    private String vnpayTransactionNo;

    @Column(name = "vnpay_response_code", length = 20)
    private String vnpayResponseCode;

    @Column(name = "vnpay_bank_code", length = 50)
    private String vnpayBankCode;

    @Column(name = "vnpay_pay_date", length = 20)
    private String vnpayPayDate;

    @Column(name = "payment_url", columnDefinition = "TEXT")
    private String paymentUrl;

    @Column(name = "paid_at")
    private LocalDateTime paidAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @PrePersist
    void onCreate() {
        LocalDateTime now = LocalDateTime.now();
        this.createdAt = now;
        this.updatedAt = now;
    }

    @PreUpdate
    void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }
}
