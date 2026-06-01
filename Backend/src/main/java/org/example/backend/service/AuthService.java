package org.example.backend.service;

import org.example.backend.dto.request.AdminRegisterRequest;
import org.example.backend.dto.request.ChangePasswordRequest;
import org.example.backend.dto.request.RegisterRequest;
import org.example.backend.dto.request.LoginRequest;
import org.example.backend.dto.LoginResponseDTO;
//import org.example.backend.entity.Apartment;
//import org.example.backend.entity.Household;
import org.example.backend.entity.Role;
import org.example.backend.entity.User;
//import org.example.backend.repository.ApartmentRepository;
//import org.example.backend.repository.HouseholdRepository;
import org.example.backend.repository.EmailOtpRepository;
import org.example.backend.repository.RoleRepository;
import org.example.backend.repository.UserRepository;
import org.example.backend.security.JwtUtil;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.DisabledException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AuthService {
	private final UserRepository userRepo;
	private final RoleRepository roleRepo;
	private final EmailOtpRepository emailOtpRepo;
//	private final ApartmentRepository apartmentRepo;
//	private final HouseholdRepository householdRepo;
	private final PasswordEncoder passwordEncoder;
	private final JwtUtil jwtTokenProvider;

	@Autowired
	public AuthService(UserRepository userRepo,
	                   RoleRepository roleRepo,
	                   PasswordEncoder passwordEncoder,
					   EmailOtpRepository emailOtpRepo,
	                   JwtUtil jwtTokenProvider) {
		this.userRepo = userRepo;
		this.roleRepo = roleRepo;
		this.passwordEncoder = passwordEncoder;
		this.emailOtpRepo = emailOtpRepo;
		this.jwtTokenProvider = jwtTokenProvider;
	}

	@Transactional
	public User registerResident(RegisterRequest request) {

		// Kiểm tra username đã tồn tại chưa
		if (userRepo.existsByUsername(request.getUsername())) {
			throw new IllegalArgumentException("Tên đăng nhập đã tồn tại!");
		}

		// Kiểm tra xác nhận lại mật khẩu đã đúng chưa
		if (!request.getPassword().equals(request.getConfirmPassword())) {
			throw new IllegalArgumentException("Mật khẩu xác nhận không khớp. Vui lòng kiểm tra lại!");
		}

		// Kiểm tra email đã tồn tại chưa
		if (userRepo.existsByEmail(request.getEmail())) {
			throw new IllegalArgumentException("Email đã được sử dụng!");
		}

		// Kiểm tra OTP gửi về mail đã được xác thực chưa (used = true)
		emailOtpRepo.findTopByEmailAndPurposeAndUsedTrueOrderByCreatedAtDesc(request.getEmail(), "REGISTER")
					.orElseThrow(() -> new IllegalArgumentException("Email chưa được xác thực. Vui lòng xác thực mã OTP trước khi đăng ký!"));

		// Lấy Role RESIDENT từ Database
		Role residentRole = roleRepo.findByName("RESIDENT")
				.orElseThrow(() -> new IllegalArgumentException("Lỗi: Không tìm thấy quyền cư dân (RESIDENT) trong hệ thống."));

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
		return userRepo.saveAndFlush(newUser);
	}

	 //Admin tạo tài khoản nội bộ

	@Transactional
	public User createInternalAccount(AdminRegisterRequest req) {
		if (userRepo.existsByUsername(req.getUsername())) {
			throw new IllegalArgumentException("Username đã được sử dụng");
		}

		// Kiểm tra xác nhận lại mật khẩu đã đúng chưa
		if (!req.getPassword().equals(req.getConfirmPassword())) {
			throw new IllegalArgumentException("Mật khẩu xác nhận không khớp. Vui lòng kiểm tra lại!");
		}

		// Kiểm tra email đã tồn tại chưa
		if (userRepo.existsByEmail(req.getEmail())) {
			throw new IllegalArgumentException("Email đã được sử dụng!");
		}

		// Kiểm tra OTP gửi về mail đã được xác thực chưa (used = true)
		emailOtpRepo.findTopByEmailAndPurposeAndUsedTrueOrderByCreatedAtDesc(req.getEmail(), "REGISTER")
					.orElseThrow(() -> new IllegalArgumentException("Email chưa được xác thực. Vui lòng xác thực mã OTP trước khi đăng ký!"));

		Role role = roleRepo.findByName(req.getRole())
				.orElseThrow(() -> new IllegalArgumentException("Không tìm thấy vai trò: " + req.getRole()));

		User newUser = new User();
		newUser.setUsername(req.getUsername());
		newUser.setFullName(req.getFullName());
		newUser.setEmail(req.getEmail());
		newUser.setPhone(req.getPhone());
		newUser.setRequestedApartmentCode(req.getRequestedApartmentCode());

		// Mã hóa mật khẩu từ DTO
		newUser.setPasswordHash(passwordEncoder.encode(req.getPassword()));

		// Tìm và set Role
		newUser.setRole(role);

		newUser.setActive(true);
		newUser.setEmailVerified(true);

		return userRepo.saveAndFlush(newUser);
	}

	// Duyệt tài khoản cư dân đã đăng ký
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

	// Đăng nhập hệ thống và cấp phát JWT
	public LoginResponseDTO login(LoginRequest req) {
		// 1. Tìm user
		User user = userRepo.findByUsername(req.getUsername())
				.orElseThrow(() -> new BadCredentialsException("Tên đăng nhập hoặc mật khẩu không chính xác"));

		// 2. So khớp mật khẩu
		boolean isMatch = passwordEncoder.matches(req.getPassword(), user.getPasswordHash());

		if (!isMatch) {
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
		return new LoginResponseDTO(
				accessToken,
				user.getId(),
				user.getRole().getName(),
				householdId
		);
	}

	@Transactional
	public void changePassword(Long userId, ChangePasswordRequest request) {
		// 1. Tìm tài khoản trong CSDL
		User user = userRepo.findById(userId)
				.orElseThrow(() -> new RuntimeException("Không tìm thấy người dùng"));

		// 2. Xác thực mật khẩu cũ
		if (!passwordEncoder.matches(request.getOldPassword(), user.getPasswordHash())) {
			throw new BadCredentialsException("Mật khẩu cũ không chính xác");
		}

		// 3. Xác nhận mật khẩu mới
		if (!request.getNewPassword().equals(request.getConfirmNewPassword())) {
			throw new IllegalArgumentException("Mật khẩu mới và xác nhận mật khẩu không khớp");
		}

		// 4. Mã hóa và lưu trữ mật khẩu mới
		user.setPasswordHash(passwordEncoder.encode(request.getNewPassword()));
		userRepo.save(user);
	}
}