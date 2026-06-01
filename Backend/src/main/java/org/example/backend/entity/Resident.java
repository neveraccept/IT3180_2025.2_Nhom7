package org.example.backend.entity;

import org.example.backend.entity.enums.Gender;
import org.example.backend.entity.enums.ResidencyStatus;
import org.example.backend.entity.enums.ResidentStatus;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDate;
import java.util.Objects;

@Entity
@Table(name = "residents",
        indexes = {
                @Index(name = "idx_resident_household", columnList = "household_id"),
                @Index(name = "idx_resident_id_card", columnList = "id_card")
        })
@Getter
@Setter
@NoArgsConstructor
public class Resident {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "full_name", nullable = false, length = 100)
    private String fullName;

    @Column(name = "id_card", length = 20)
    private String idCard;

    @Column(name = "date_of_birth")
    private LocalDate dateOfBirth;

    @Enumerated(EnumType.STRING)
    @Column(name = "gender", length = 10)
    private Gender gender;

    @Column(name = "relation_to_head", length = 30)
    private String relationToHead;

    @Enumerated(EnumType.STRING)
    @Column(name = "residency_status", nullable = false, length = 20)
    private ResidencyStatus residencyStatus = ResidencyStatus.PERMANENT;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    private ResidentStatus status = ResidentStatus.ACTIVE;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "household_id", nullable = false,
            foreignKey = @ForeignKey(name = "fk_resident_household"))
    private Household household;

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof Resident that)) return false;
        return id != null && Objects.equals(id, that.id);
    }

    @Override
    public int hashCode() {
        return getClass().hashCode();
    }
}


