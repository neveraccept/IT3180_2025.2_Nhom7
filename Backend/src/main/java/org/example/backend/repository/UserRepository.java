package org.example.backend.repository;

import org.example.backend.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long> {
	// Phục vụ luồng đăng nhập và kiểm tra trùng lặp khi đăng ký
	@Query("SELECT u FROM User u JOIN FETCH u.role WHERE u.username = :username")
	Optional<User> findByUsername(@Param("username") String username);
	boolean existsByUsername(String username);

	// THÊM MỚI CHO LUỒNG APPROVE VÀ XEM CHI TIẾT
	@Query("SELECT u FROM User u JOIN FETCH u.role WHERE u.id = :id")
	Optional<User> findByIdWithRole(@Param("id") Long id);

	// Phục vụ luồng quên mật khẩu và kiểm tra trùng lặp email
	@Query("SELECT u FROM User u WHERE u.email = :email")
	Optional<User> findByEmail(@Param("email") String email);
	boolean existsByEmail(String email);

	// Phục vụ màn hình Admin lấy danh sách tài khoản chờ duyệt
	@Query("SELECT u FROM User u JOIN FETCH u.role WHERE u.active = false AND u.household IS NULL")
	List<User> findPendingApprovals();

	// Phục vụ màn hình Admin liệt kê TẤT CẢ tài khoản trong hệ thống
	@Query("SELECT u FROM User u JOIN FETCH u.role ORDER BY u.id")
	List<User> findAllWithRole();

	@Query("""
            SELECT u FROM User u
            WHERE u.active = true AND u.household IS NOT NULL
            """)
	List<User> findActiveResidents();

	@Query("""
            SELECT u FROM User u
            WHERE u.active = true AND u.household IS NOT NULL
              AND u.household.apartment.floor IN :floors
            """)
	List<User> findActiveResidentsByFloors(@Param("floors") List<Integer> floors);

	@Query("""
            SELECT u FROM User u
            WHERE u.active = true AND u.household IS NOT NULL
              AND u.household.id IN :householdIds
            """)
	List<User> findActiveResidentsByHouseholdIds(@Param("householdIds") List<Long> householdIds);
}


