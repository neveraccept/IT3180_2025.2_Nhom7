package org.example.backend.entity;

import org.example.backend.entity.enums.VehicleType;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDate;
import java.util.Objects;

/**
 * Phương tiện (xe máy / ô tô) do một hộ dân đăng ký gửi trong chung cư.
 * Bảng `vehicles` – UNIQUE(license_plate).
 */
@Entity
@Table(name = "vehicles",
        uniqueConstraints = @UniqueConstraint(name = "uk_vehicle_plate", columnNames = "license_plate"))
@Getter
@Setter
@NoArgsConstructor
public class Vehicle {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "household_id", nullable = false,
            foreignKey = @ForeignKey(name = "fk_vehicle_household"))
    private Household household;

    @Column(name = "license_plate", nullable = false, length = 20)
    private String licensePlate;

    @Enumerated(EnumType.STRING)
    @Column(name = "type", nullable = false, length = 20)
    private VehicleType type;

    @Column(name = "registered_date")
    private LocalDate registeredDate;

    @Column(name = "active", nullable = false)
    private Boolean active = true;

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof Vehicle that)) return false;
        return id != null && Objects.equals(id, that.id);
    }

    @Override
    public int hashCode() {
        return getClass().hashCode();
    }
}
