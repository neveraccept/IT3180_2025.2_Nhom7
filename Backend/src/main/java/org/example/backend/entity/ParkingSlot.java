package org.example.backend.entity;

import org.example.backend.entity.enums.ParkingSlotStatus;
import org.example.backend.entity.enums.VehicleType;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.Objects;

/**
 * Một chỗ gửi xe vật lý trong bãi. Bảng `parking_slots` – UNIQUE(code).
 * `type` quyết định loại xe có thể đỗ (MOTORBIKE/CAR).
 */
@Entity
@Table(name = "parking_slots",
        uniqueConstraints = @UniqueConstraint(name = "uk_slot_code", columnNames = "code"))
@Getter
@Setter
@NoArgsConstructor
public class ParkingSlot {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "code", nullable = false, length = 20)
    private String code;

    @Enumerated(EnumType.STRING)
    @Column(name = "type", nullable = false, length = 20)
    private VehicleType type;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    private ParkingSlotStatus status = ParkingSlotStatus.EMPTY;

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof ParkingSlot that)) return false;
        return id != null && Objects.equals(id, that.id);
    }

    @Override
    public int hashCode() {
        return getClass().hashCode();
    }
}
