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
	// (loại trừ tài khoản đã xóa mềm để không cho đăng nhập lại)
	@Query("SELECT u FROM User u JOIN FETCH u.role WHERE u.username = :username AND u.deleted = false")
	Optional<User> findByUsername(@Param("username") String username);
	boolean existsByUsername(String username);

	@Query("SELECT u FROM User u JOIN FETCH u.role WHERE u.id = :id")
	Optional<User> findByIdWithRole(@Param("id") Long id);

	// Phục vụ luồng quên mật khẩu và kiểm tra trùng lặp email
	@Query("SELECT u FROM User u WHERE u.email = :email")
	Optional<User> findByEmail(@Param("email") String email);
	boolean existsByEmail(String email);

	// Phục vụ màn hình Admin lấy danh sách tài khoản chờ duyệt (bỏ qua tài khoản đã xóa mềm)
	@Query("SELECT u FROM User u JOIN FETCH u.role WHERE u.active = false AND u.household IS NULL AND u.deleted = false")
	List<User> findPendingApprovals();

	// Phục vụ màn hình Admin liệt kê TẤT CẢ tài khoản trong hệ thống (bỏ qua tài khoản đã xóa mềm)
	@Query("SELECT u FROM User u JOIN FETCH u.role WHERE u.deleted = false ORDER BY u.id")
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

	// Kiểm tra một nhân khẩu đã được cấp tài khoản chưa (bỏ qua tài khoản đã xóa mềm).
	boolean existsByResident_IdAndDeletedFalse(Long residentId);

	// Liệt kê các tài khoản gắn với một hộ — qua nhân khẩu (resident.household) HOẶC qua household_id trực tiếp.
	// Phục vụ tab "Tài khoản" trong trang Căn hộ và thao tác khóa tài khoản khi chuyển cả hộ đi.
	@Query("""
            SELECT DISTINCT u FROM User u
            JOIN FETCH u.role
            LEFT JOIN u.resident r
            LEFT JOIN r.household rh
            LEFT JOIN u.household uh
            WHERE u.deleted = false
              AND (rh.id = :householdId OR uh.id = :householdId)
            ORDER BY u.id
            """)
	List<User> findAccountsByHousehold(@Param("householdId") Long householdId);
}


