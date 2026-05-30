package org.example.backend.entity;

import org.example.backend.entity.enums.ApartmentStatus;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.util.Objects;

@Entity
@Table(name = "apartments",
        uniqueConstraints = @UniqueConstraint(name = "uk_apartment_code", columnNames = "code"))
@Getter
@Setter
@NoArgsConstructor
public class Apartment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "code", nullable = false, length = 20, updatable = false)
    private String code;

    @Column(name = "floor", nullable = false)
    private Integer floor;

    @Column(name = "area", nullable = false, precision = 10, scale = 2)
    private BigDecimal area;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    private ApartmentStatus status = ApartmentStatus.AVAILABLE;

    @Column(name = "note", columnDefinition = "TEXT")
    private String note;

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof Apartment that)) return false;
        return id != null && Objects.equals(id, that.id);
    }

    @Override
    public int hashCode() {
        return getClass().hashCode();
    }
}


