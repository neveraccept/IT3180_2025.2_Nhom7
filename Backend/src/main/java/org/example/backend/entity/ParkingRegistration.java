package org.example.backend.entity;

import org.example.backend.entity.enums.ParkingRegistrationStatus;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Objects;

/**
 * Một lượt đăng ký/cho thuê chỗ gửi xe. Bảng `parking_registrations`.
 *  - Gán xe của hộ: `vehicle` != null, `renterName/renterPhone` = null → slot USED.
 *  - Cho người ngoài thuê: `vehicle` = null, có `renterName/renterPhone` → slot RENTED.
 */
@Entity
@Table(name = "parking_registrations")
@Getter
@Setter
@NoArgsConstructor
public class ParkingRegistration {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "slot_id", nullable = false,
            foreignKey = @ForeignKey(name = "fk_reg_slot"))
    private ParkingSlot slot;

    /** NULL nếu là cho người ngoài hộ thuê. */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "vehicle_id",
            foreignKey = @ForeignKey(name = "fk_reg_vehicle"))
    private Vehicle vehicle;

    @Column(name = "renter_name", length = 100)
    private String renterName;

    @Column(name = "renter_phone", length = 20)
    private String renterPhone;

    @Column(name = "renter_license_plate")
    private String renterLicensePlate;

    @Column(name = "start_date")
    private LocalDate startDate;

    @Column(name = "end_date")
    private LocalDate endDate;

    @Column(name = "monthly_fee", precision = 15, scale = 2)
    private BigDecimal monthlyFee;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    private ParkingRegistrationStatus status = ParkingRegistrationStatus.ACTIVE;

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof ParkingRegistration that)) return false;
        return id != null && Objects.equals(id, that.id);
    }

    @Override
    public int hashCode() {
        return getClass().hashCode();
    }
}
