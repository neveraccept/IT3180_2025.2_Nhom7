package org.example.backend.service;

import org.example.backend.dto.RegisterRequest;
import org.example.backend.dto.LoginRequest;
import org.example.backend.dto.LoginResponse;
//import org.example.backend.entity.Apartment;
//import org.example.backend.entity.Household;
import org.example.backend.entity.Role;
import org.example.backend.entity.User;
//import org.example.backend.repository.ApartmentRepository;
//import org.example.backend.repository.HouseholdRepository;
import org.example.backend.repository.RoleRepository;
import org.example.backend.repository.UserRepository;
import org.example.backend.security.JwtUtil;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.DisabledException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AuthService {
	private final UserRepository userRepo;
	private final RoleRepository roleRepo;
//	private final ApartmentRepository apartmentRepo;
//	private final HouseholdRepository householdRepo;
	private final BCryptPasswordEncoder passwordEncoder;
	private final OtpService otpService;
	private final JwtUtil jwtTokenProvider;

	// Cập nhật Constructor: Tiêm thêm các Repository cần thiết
	public AuthService(UserRepository userRepo,
                       RoleRepository roleRepo,
//	                   ApartmentRepository apartmentRepo,
//	                   HouseholdRepository householdRepo,
                       BCryptPasswordEncoder passwordEncoder,
                       OtpService otpService, JwtUtil jwtTokenProvider) {
		this.userRepo = userRepo;
		this.roleRepo = roleRepo;
//		this.apartmentRepo = apartmentRepo;
//		this.householdRepo = householdRepo;
		this.passwordEncoder = passwordEncoder;
		this.otpService = otpService;
        this.jwtTokenProvider = jwtTokenProvider;
    }

	//Đăng ký tài khoản cư dân

	@Transactional
	public User registerResident(RegisterRequest req) {
		// 1. Kiểm tra xác nhận mật khẩu
		if (!req.getPassword().equals(req.getConfirmPassword())) {
			throw new IllegalArgumentException("Mật khẩu và xác nhận không khớp");
		}

		// 2. Kiểm tra tài khoản tồn tại
		if (userRepo.existsByUsername(req.getUsername())) {
			throw new IllegalArgumentException("USERNAME_EXISTS");
		}

		// 3. Xác thực OTP
//		boolean isOtpValid = otpService.verifyOtp(req.getEmail(), req.getOtp(), "REGISTER");
//		if (!isOtpValid) {
//			throw new IllegalArgumentException("Mã OTP không hợp lệ hoặc đã hết hạn");
//		}

		// 4. Khởi tạo và lưu User
		User u = new User();
		u.setUsername(req.getUsername());
		u.setPasswordHash(passwordEncoder.encode(req.getPassword()));
		u.setFullName(req.getFullName());
		u.setEmail(req.getEmail());
		u.setPhone(req.getPhone());
		u.setRequestedApartmentCode(req.getRequestedApartmentCode());

		Role residentRole = roleRepo.findByName("RESIDENT")
				.orElseThrow(() -> new IllegalArgumentException("Không tìm thấy vai trò RESIDENT trong CSDL"));
		u.setRole(residentRole);

		u.setActive(false);
		u.setEmailVerified(true);

		return userRepo.save(u);
	}

	 //Admin tạo tài khoản nội bộ

	@Transactional
	public User createInternalUser(User req) {
		if (userRepo.existsByUsername(req.getUsername())) {
			throw new IllegalArgumentException("USERNAME_EXISTS");
		}

		req.setPasswordHash(passwordEncoder.encode(req.getPasswordHash()));

		if (req.getRole() == null || req.getRole().getName() == null) {
			throw new IllegalArgumentException("Thiếu thông tin vai trò (Role)");
		}
		Role role = roleRepo.findByName(req.getRole().getName())
				.orElseThrow(() -> new IllegalArgumentException("Không tìm thấy vai trò này trong hệ thống"));
		req.setRole(role);

		req.setActive(true);
		req.setEmailVerified(true);

		return userRepo.save(req);
	}

	//Admin duyệt tài khoản cư dân tự đăng ký

	@Transactional
	public User approveResidentAccount(Long userId) {
		// 1. Tìm tài khoản cư dân
		User user = userRepo.findById(userId)
				.orElseThrow(() -> new IllegalArgumentException("Không tìm thấy tài khoản người dùng"));

		if (user.isActive()) {
			throw new IllegalArgumentException("Tài khoản này đã được duyệt từ trước");
		}

		String aptCode = user.getRequestedApartmentCode();
		if (aptCode == null || aptCode.trim().isEmpty()) {
			throw new IllegalArgumentException("Tài khoản này không có thông tin mã căn hộ yêu cầu");
		}

		// 2. Đối chiếu requested_apartment_code với danh sách căn hộ
//		Apartment apartment = apartmentRepo.findByCode(aptCode)
//				.orElseThrow(() -> new IllegalArgumentException("Mã căn hộ (" + aptCode + ") không tồn tại trong hệ thống"));

		// 3. Tìm Hộ dân đang hoạt động (ACTIVE) bên trong căn hộ đó
//		Household activeHousehold = householdRepo.findByApartmentIdAndStatus(apartment.getId(), "ACTIVE")
//				.orElseThrow(() -> new IllegalArgumentException("Căn hộ " + aptCode + " hiện chưa có hộ dân nào đang hoạt động (ACTIVE) để gán"));

		// 4. Gán hộ dân và kích hoạt tài khoản
//		user.setHousehold(activeHousehold);
		user.setActive(true);
		user.setRequestedApartmentCode(null);

		return userRepo.save(user);
	}

	// Đăng nhập hệ thống và cấp phát JWT
	public LoginResponse login(LoginRequest req) {
		System.out.println("Dang thu dang nhap voi username: [" + req.getUsername() + "]");
		System.out.println("Mat khau client gui len: [" + req.getPassword() + "]");

		// 1. Tìm user
		User user = userRepo.findByUsername(req.getUsername())
				.orElseThrow(() -> {
					System.out.println("LỖI 1: Không tìm thấy username trong DB!");
					return new BadCredentialsException("Tên đăng nhập hoặc mật khẩu không chính xác");
				});

		// 2. So khớp mật khẩu
		boolean isMatch = passwordEncoder.matches(req.getPassword(), user.getPasswordHash());
		System.out.println("Ket qua so khop BCrypt: " + isMatch);

		if (!isMatch) {
			System.out.println("LỖI 2: Mật khẩu băm không khớp!");
			throw new BadCredentialsException("Tên đăng nhập hoặc mật khẩu không chính xác");
		}

		// 3. Kiểm tra trạng thái kích hoạt (cờ active)
		if (!user.isActive()) {
			throw new DisabledException("Tài khoản của bạn chưa được duyệt hoặc đã bị khóa");
		}

		// 4. Sinh JWT Token thông qua Provider
		String accessToken = jwtTokenProvider.generateToken(user);

		// 5. Trích xuất Household ID (nếu có)
		Long householdId = null;
		// Giả sử Entity User của bạn có quan hệ với Household qua biến household
		// Nếu bạn đang đóng comment phần Household, hãy điều chỉnh lại logic này sau khi mở comment
		// if (user.getHousehold() != null) {
		//     householdId = user.getHousehold().getId();
		// }

		// 6. Đóng gói và trả về DTO
		return new LoginResponse(
				accessToken,
				user.getId(),
				user.getRole().getName(),
				householdId
		);
	}
}