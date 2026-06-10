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

	// Cờ xóa mềm (Soft Delete): true = tài khoản đã bị Admin xóa, ẩn khỏi mọi danh sách.
	// Dùng cột riêng thay vì tái sử dụng `active` vì active=false còn mang nghĩa "chờ duyệt".
	@Column(nullable = false)
	private boolean deleted = false;

	@Column(name = "email_verified")
	private boolean emailVerified = false;

	@Column(name = "requested_apartment_code", length = 20)
	private String requestedApartmentCode;

	@ManyToOne(fetch = FetchType.LAZY)
	@JoinColumn(name = "role_id", nullable = false)
	private Role role;

	@ManyToOne(fetch = FetchType.LAZY)
	@JoinColumn(name = "household_id")
	private Household household;

	// Nhân khẩu (cư dân) mà tài khoản này đại diện. Có thể null với tài khoản nội bộ (ADMIN/Kế toán).
	// Là "nguồn sự thật" cho luồng cấp tài khoản theo cư dân (grant-access) và khóa tài khoản khi cả hộ chuyển đi.
	// Vẫn giữ household_id song song để các truy vấn thanh toán/thông báo theo hộ hiện có không phải đổi.
	@ManyToOne(fetch = FetchType.LAZY)
	@JoinColumn(name = "resident_id",
			foreignKey = @ForeignKey(name = "fk_user_resident"))
	private Resident resident;
}


