package org.example.backend.repository;

import org.example.backend.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {

    // Phục vụ luồng đăng nhập và kiểm tra trùng lặp khi đăng ký
    Optional<User> findByUsername(String username);
    boolean existsByUsername(String username);

    // Phục vụ luồng quên mật khẩu và kiểm tra trùng lặp email
    Optional<User> findByEmail(String email);
    boolean existsByEmail(String email);

    // Phục vụ màn hình Admin lấy danh sách tài khoản chờ duyệt
    // (Tài khoản có active = false và chưa được gán household_id)
    // List<User> findByActiveFalseAndHouseholdIsNull();
}