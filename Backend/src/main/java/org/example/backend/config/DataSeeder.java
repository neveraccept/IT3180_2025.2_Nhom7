package org.example.backend.config;

import org.example.backend.entity.Role;
import org.example.backend.entity.User;
import org.example.backend.repository.RoleRepository;
import org.example.backend.repository.UserRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
public class DataSeeder implements CommandLineRunner {

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final PasswordEncoder passwordEncoder;

    public DataSeeder(UserRepository userRepository, RoleRepository roleRepository, PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.roleRepository = roleRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    @Transactional
    public void run(String... args) throws Exception {
        // 1. Khởi tạo Role ADMIN nếu chưa có
        Role adminRole = roleRepository.findByName("ADMIN").orElseGet(() -> {
            Role newRole = new Role();
            newRole.setName("ADMIN");
            return roleRepository.save(newRole);
        });

        // 2. Khởi tạo Role RESIDENT nếu chưa có
        roleRepository.findByName("RESIDENT").orElseGet(() -> {
            Role newRole = new Role();
            newRole.setName("RESIDENT");
            return roleRepository.save(newRole);
        });

        // 3. Kiểm tra và tạo tài khoản Admin mặc định
        if (!userRepository.existsByUsername("admin")) {
            User admin = new User();
            admin.setUsername("admin");

            // Hệ thống sẽ dùng thuật toán chuẩn để băm mật khẩu
            admin.setPasswordHash(passwordEncoder.encode("admin123"));

            admin.setFullName("Quản trị viên BlueMoon");
            admin.setEmail("admin@bluemoon.com");
            admin.setActive(true);
            admin.setEmailVerified(true);
            admin.setRole(adminRole);
//            admin.setHousehold(null);

            userRepository.save(admin);
            System.out.println("====== ĐÃ KHỞI TẠO THÀNH CÔNG TÀI KHOẢN ADMIN (admin / admin123) ======");
        }
    }
}