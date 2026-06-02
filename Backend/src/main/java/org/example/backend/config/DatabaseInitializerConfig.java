package org.example.backend.config;

import org.example.backend.entity.Role;
import org.example.backend.entity.User;
import org.example.backend.repository.RoleRepository;
import org.example.backend.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
public class DatabaseInitializerConfig implements CommandLineRunner {

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final PasswordEncoder passwordEncoder;

    @Autowired
    public DatabaseInitializerConfig(UserRepository userRepository,
                               RoleRepository roleRepository,
                               PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.roleRepository = roleRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    @Transactional
    public void run(String... args) throws Exception {
        // 1. Tự động khởi tạo Role nếu chưa có
        if (roleRepository.findByName("ADMIN").isEmpty()) {
            roleRepository.save(Role.builder().name("ADMIN").build());
        }
        if (roleRepository.findByName("RESIDENT").isEmpty()) {
            roleRepository.save(Role.builder().name("RESIDENT").build());
        }

        // 2. Tự động khởi tạo tài khoản Admin dùng chung
        if (!userRepository.existsByUsername("admin")) {
            Role adminRole = roleRepository.findByName("ADMIN").get();

            User admin = User.builder()
                    .username("admin")
                    .passwordHash(passwordEncoder.encode("admin123")) // Mật khẩu chung là 123456
                    .fullName("Quản trị viên Hệ thống")
                    .role(adminRole)
                    .active(true) // Bật sẵn để đăng nhập luôn
                    .emailVerified(true)
                    // .household(null)
                    .build();

            userRepository.save(admin);
            System.out.println("Đã tự động tạo tài khoản Admin (admin / admin123)");
        }

        // 3. Tự động khởi tạo tài khoản Resident dùng chung để tiện test
        if (!userRepository.existsByUsername("user")) {
            Role residentRole = roleRepository.findByName("RESIDENT").get();

            User resident = User.builder()
                    .username("user")
                    .passwordHash(passwordEncoder.encode("user123")) // Mật khẩu theo yêu cầu là user123
                    .fullName("Cư dân Test")
                    .role(residentRole) // Gán role RESIDENT
                    .active(true) // Bật sẵn active = true để có thể đăng nhập ngay mà không cần Admin duyệt
                    .emailVerified(true)
                    .build();

            userRepository.save(resident);
            System.out.println("Đã tự động tạo tài khoản Resident (user / user123)");
        }
    }
}