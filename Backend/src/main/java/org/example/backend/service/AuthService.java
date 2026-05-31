package org.example.backend.service;

import org.example.backend.dto.RegisterRequestDTO;
import org.example.backend.entity.EmailOtp;
import org.example.backend.entity.Role;
import org.example.backend.entity.User;
import org.example.backend.repository.EmailOtpRepository;
import org.example.backend.repository.RoleRepository;
import org.example.backend.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AuthService {

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final PasswordEncoder passwordEncoder;
    private final EmailOtpRepository emailOtpRepository;

    @Autowired
    public AuthService(UserRepository userRepository,
                       RoleRepository roleRepository,
                       PasswordEncoder passwordEncoder, EmailOtpRepository emailOtpRepository) {
        this.userRepository = userRepository;
        this.roleRepository = roleRepository;
        this.passwordEncoder = passwordEncoder;
        this.emailOtpRepository = emailOtpRepository;
    }

    @Transactional
    public void registerResident(RegisterRequestDTO request) {
        // 0. Kiểm tra xác nhận lại mật khẩu đã đúng chưa
        if (!request.getPassword().equals(request.getConfirmPassword())) {
            throw new RuntimeException("Mật khẩu xác nhận không khớp. Vui lòng kiểm tra lại!");
        }

        // 1. Kiểm tra username đã tồn tại chưa
        if (userRepository.existsByUsername(request.getUsername())) {
            throw new RuntimeException("Tên đăng nhập đã tồn tại!");
        }

        // 2. Kiểm tra email đã tồn tại chưa
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new RuntimeException("Email đã được sử dụng!");
        }

        // Kiểm tra OTP gửi về mail đã được xác thực chưa (used = true)
        EmailOtp verifiedOtp = emailOtpRepository
                .findTopByEmailAndPurposeAndUsedTrueOrderByCreatedAtDesc(request.getEmail(), "REGISTER")
                .orElseThrow(() -> new RuntimeException("Email chưa được xác thực. Vui lòng xác thực mã OTP trước khi đăng ký!"));

        // 3. Lấy Role RESIDENT từ Database
        Role residentRole = roleRepository.findByName("RESIDENT")
                .orElseThrow(() -> new RuntimeException("Lỗi: Không tìm thấy quyền cư dân (RESIDENT) trong hệ thống."));

        // 4. Tạo đối tượng User mới
        User newUser = User.builder()
                .username(request.getUsername())
                .passwordHash(passwordEncoder.encode(request.getPassword())) // Băm mật khẩu bằng BCrypt
                .fullName(request.getFullName())
                .email(request.getEmail())
                .phone(request.getPhone())
                .role(residentRole)
                .active(false) //Tài khoản mới tạo mặc định chờ duyệt
                .emailVerified(true)
                // Cư dân tự đăng ký chưa có household_id chính thức
                // TODO
                // .household(null)
                // Lưu lại mã căn hộ yêu cầu để Admin đối soát ở dashboard
                .requestedApartmentCode(request.getRequestedApartmentCode())
                .build();

        // 5. Lưu vào database
        userRepository.save(newUser);
    }
}