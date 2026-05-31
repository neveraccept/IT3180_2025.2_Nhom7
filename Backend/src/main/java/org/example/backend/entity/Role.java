package org.example.backend.entity;

import jakarta.persistence.*;
import lombok.*;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

@Entity
@Table(name = "roles")
@Getter
@Setter
@NoArgsConstructor // Tự động sinh public Role() {}
@AllArgsConstructor // Tự động sinh constructor full tham số
@Builder
public class Role {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "name", length = 50, nullable = false, unique = true)
    private String name;

    private String description;

    // Constructor tùy chỉnh cho việc gán tên Role nhanh
    public Role(String name) {
        this.name = name;
    }
}