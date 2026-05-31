package org.example.backend.entity;

import jakarta.persistence.*;
import lombok.*;
import org.springframework.boot.jdbc.DataSourceBuilder;

import javax.sql.DataSource;

@Entity
@Table(name = "users")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class User {
	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@Column(nullable = false, length = 50, unique = true)
	private String username;

	@Column(name = "password_hash", nullable = false, length = 255)
	private String passwordHash;

	@Column(name = "full_name", nullable = false, length = 100)
	private String fullName;

	@Column(length = 100)
	private String email;

	@Column(length = 20)
	private String phone;

	@Column
	private boolean active = false;

	@Column(name = "email_verified")
	private boolean emailVerified = false;

	@Column(name = "requested_apartment_code", length = 20)
	private String requestedApartmentCode;

	@ManyToOne(fetch = FetchType.LAZY)
	@JoinColumn(name = "role_id", nullable = false)
	private Role role;

//	@Column(name = "household", length = 20)
//	private Household household = null;
}


