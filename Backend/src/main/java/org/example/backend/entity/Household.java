package org.example.backend.entity;

import org.example.backend.entity.enums.HouseholdStatus;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;

@Entity
@Table(name = "households",
        uniqueConstraints = @UniqueConstraint(name = "uk_household_code", columnNames = "code"))
@Getter
@Setter
@NoArgsConstructor
public class Household {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "code", nullable = false, length = 20)
    private String code;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "apartment_id", nullable = false,
            foreignKey = @ForeignKey(name = "fk_household_apartment"))
    private Apartment apartment;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "head_resident_id",
            foreignKey = @ForeignKey(name = "fk_household_head_resident"))
    private Resident headOfHousehold;

    @Column(name = "move_in_date")
    private LocalDate moveInDate;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    private HouseholdStatus status = HouseholdStatus.ACTIVE;

    @OneToMany(mappedBy = "household", fetch = FetchType.LAZY)
    private List<Resident> residents = new ArrayList<>();

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof Household that)) return false;
        return id != null && Objects.equals(id, that.id);
    }

    @Override
    public int hashCode() {
        return getClass().hashCode();
    }
}


