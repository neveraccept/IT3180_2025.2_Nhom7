package org.example.backend.service;

import jakarta.validation.Valid;
import org.example.backend.dto.CreateUserRequest;
import org.example.backend.entity.Role;
import org.example.backend.entity.User;
import org.example.backend.repository.RoleRepository;
import org.example.backend.repository.UserRepository;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class UserService {

    private final UserRepository userRepo;
    private final RoleRepository roleRepo;
    private final PasswordEncoder passwordEncoder;

    public UserService(UserRepository userRepo, RoleRepository roleRepo, PasswordEncoder passwordEncoder) {
        this.userRepo = userRepo;
        this.roleRepo = roleRepo;
        this.passwordEncoder = passwordEncoder;
    }

    /**
     * Nghiệp vụ: Tạo tài khoản nội bộ (Admin hoặc Resident)
     * Đã xóa các annotation @Valid và @RequestBody không cần thiết
     */
    @Transactional
    public User createInternalAccount(CreateUserRequest req) {
        if (userRepo.existsByUsername(req.getUsername())) {
            throw new IllegalArgumentException("USERNAME_EXISTS");
        }

        User newUser = new User();
        newUser.setUsername(req.getUsername());
        newUser.setFullName(req.getFullName());
        newUser.setEmail(req.getEmail());
        newUser.setPhone(req.getPhone());
        newUser.setRequestedApartmentCode(req.getRequested_apartment_code());

        // Mã hóa mật khẩu từ DTO
        newUser.setPasswordHash(passwordEncoder.encode(req.getPassword()));

        // Tìm và set Role
        Role role = roleRepo.findByName(req.getRole())
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy vai trò: " + req.getRole()));
        newUser.setRole(role);

        newUser.setActive(true);
        newUser.setEmailVerified(true);

        return userRepo.saveAndFlush(newUser);
    }

    /**
     * Nghiệp vụ: Duyệt tài khoản cư dân đã đăng ký
     */
    @Transactional
    public User approveResidentAccount(Long id) {
        // 1. Tìm tài khoản cư dân theo ID
        User user = userRepo.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy tài khoản với ID: " + id));

        // 2. Kiểm tra xem tài khoản đã được duyệt trước đó chưa
        if (user.isActive()) {
            throw new IllegalArgumentException("Tài khoản này đã được kích hoạt từ trước!");
        }

        // 3. Duyệt tài khoản
        user.setActive(true);

        // TODO (Sau này khi làm module Căn Hộ/Hộ Khẩu):
        // Lấy mã user.getRequestedApartmentCode() để tìm Căn hộ,
        // lấy Household tương ứng và gán vào user.setHousehold(...)

        // 4. Lưu thay đổi
        return userRepo.saveAndFlush(user);
    }

}