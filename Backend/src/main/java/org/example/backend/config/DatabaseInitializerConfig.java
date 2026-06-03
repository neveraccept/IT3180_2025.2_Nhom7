package org.example.backend.config;

import org.example.backend.entity.ParkingSlot;
import org.example.backend.entity.Role;
import org.example.backend.entity.User;
import org.example.backend.entity.enums.ParkingSlotStatus;
import org.example.backend.entity.enums.VehicleType;
import org.example.backend.repository.ParkingSlotRepository;
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
    private final ParkingSlotRepository parkingSlotRepository;

    @Autowired
    public DatabaseInitializerConfig(UserRepository userRepository,
                                     RoleRepository roleRepository,
                                     PasswordEncoder passwordEncoder,
                                     ParkingSlotRepository parkingSlotRepository) {
        this.userRepository = userRepository;
        this.roleRepository = roleRepository;
        this.passwordEncoder = passwordEncoder;
        this.parkingSlotRepository = parkingSlotRepository;
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

        // 4. Tự động khởi tạo chỗ gửi xe nếu bãi xe đang trống
        if (parkingSlotRepository.count() == 0) {
            System.out.println("Bãi gửi xe đang trống, tiến hành khởi tạo chỗ đỗ xe...");

            // Tạo 50 chỗ đỗ xe máy
            for (int i = 1; i <= 50; i++) {
                ParkingSlot slot = new ParkingSlot();
                slot.setCode("M-" + String.format("%03d", i)); // VD: M-001
                slot.setType(VehicleType.MOTORBIKE);
                slot.setStatus(ParkingSlotStatus.EMPTY);
                parkingSlotRepository.save(slot);
            }

            // Tạo 20 chỗ đỗ ô tô
            for (int i = 1; i <= 20; i++) {
                ParkingSlot slot = new ParkingSlot();
                slot.setCode("C-" + String.format("%03d", i)); // VD: C-001
                slot.setType(VehicleType.CAR);
                slot.setStatus(ParkingSlotStatus.EMPTY);
                parkingSlotRepository.save(slot);
            }

            System.out.println("Đã khởi tạo xong 50 chỗ xe máy và 20 chỗ ô tô.");
        }
    }
}