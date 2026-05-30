package org.example.backend.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import lombok.*;

@Entity
@Table(name = "users")
@Setter
@Getter
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

	@Column(nullable = false)
	private boolean active = false;

	@Column(name = "email_verified", nullable = false)
	private boolean emailVerified = false;

	@Column(name = "requested_apartment_code", length = 20)
	private String requestedApartmentCode;

	@ManyToOne(fetch = FetchType.EAGER)
	@JoinColumn(name = "role_id", nullable = false)
	private Role role;

//	@Column(name = "household", length = 20)
//	private Household household = null;

	public User() {}
}


