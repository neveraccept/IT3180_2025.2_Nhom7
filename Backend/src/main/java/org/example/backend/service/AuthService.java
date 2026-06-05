package org.example.backend.service;

import org.example.backend.dto.request.*;
import org.example.backend.dto.LoginResponseDTO;
import org.example.backend.entity.Apartment;
import org.example.backend.entity.Household;
import org.example.backend.entity.Role;
import org.example.backend.entity.User;
import org.example.backend.entity.enums.HouseholdStatus;
import org.example.backend.repository.ApartmentRepository;
import org.example.backend.repository.HouseholdRepository;
import org.example.backend.repository.*;
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
	private final ApartmentRepository apartmentRepo;
	private final HouseholdRepository householdRepo;
	private final PasswordEncoder passwordEncoder;
	private final JwtUtil jwtTokenProvider;
	private final OtpService otpService;
	private final EmailService emailService;

	@Autowired
	public AuthService(UserRepository userRepo,
	                   RoleRepository roleRepo,
					   ApartmentRepository apartmentRepo,
					   HouseholdRepository householdRepo,
	                   PasswordEncoder passwordEncoder,
					   EmailOtpRepository emailOtpRepo,
	                   JwtUtil jwtTokenProvider,
					   OtpService otpService,
					   EmailService emailService) {
		this.userRepo = userRepo;
		this.roleRepo = roleRepo;
		this.apartmentRepo = apartmentRepo;
		this.householdRepo = householdRepo;
		this.passwordEncoder = passwordEncoder;
		this.emailOtpRepo = emailOtpRepo;
		this.jwtTokenProvider = jwtTokenProvider;
		this.otpService = otpService;
		this.emailService = emailService;
	}

	@Transactional
	public User registerResident(RegisterRequest request) {

		// Kiểm tra username đã tồn tại chưa
		if (userRepo.existsByUsername(request.username())) {
			throw new IllegalArgumentException("Tên đăng nhập đã tồn tại!");
		}

		// Kiểm tra xác nhận lại mật khẩu đã đúng chưa
		if (!request.password().equals(request.confirmPassword())) {
			throw new IllegalArgumentException("Mật khẩu xác nhận không khớp. Vui lòng kiểm tra lại!");
		}

		// Kiểm tra email đã tồn tại chưa
		if (userRepo.existsByEmail(request.email())) {
			throw new IllegalArgumentException("Email đã được sử dụng!");
		}

		// Kiểm tra OTP gửi về mail đã được xác thực chưa (used = true)
		emailOtpRepo.findTopByEmailAndPurposeAndUsedTrueOrderByCreatedAtDesc(request.email(), "REGISTER")
					.orElseThrow(() -> new IllegalArgumentException("Email chưa được xác thực. Vui lòng xác thực mã OTP trước khi đăng ký!"));

		// Lấy Role RESIDENT từ Database
		Role residentRole = roleRepo.findByName("RESIDENT")
				.orElseThrow(() -> new IllegalArgumentException("Lỗi: Không tìm thấy quyền cư dân (RESIDENT) trong hệ thống."));

		// 4. Tạo đối tượng User mới
		User newUser = User.builder()
				.username(request.username())
				.passwordHash(passwordEncoder.encode(request.password())) // Băm mật khẩu bằng BCrypt
				.fullName(request.fullName())
				.email(request.email())
				.phone(request.phone())
				.role(residentRole)
				.active(false) //Tài khoản mới tạo mặc định chờ duyệt
				.emailVerified(true)
				.household(null)

				// Lưu lại mã căn hộ yêu cầu để Admin đối soát ở dashboard
				.requestedApartmentCode(request.requestedApartmentCode())
				.build();

		// 5. Lưu vào database
		return userRepo.saveAndFlush(newUser);
	}

	 //Admin tạo tài khoản nội bộ
	@Transactional
	public User createInternalAccount(AdminRegisterRequest req) {
		if (userRepo.existsByUsername(req.username())) {
			throw new IllegalArgumentException("Username đã được sử dụng");
		}

		// Kiểm tra xác nhận lại mật khẩu đã đúng chưa
		if (!req.password().equals(req.confirmPassword())) {
			throw new IllegalArgumentException("Mật khẩu xác nhận không khớp. Vui lòng kiểm tra lại!");
		}

		// Kiểm tra email đã tồn tại chưa
		if (userRepo.existsByEmail(req.email())) {
			throw new IllegalArgumentException("Email đã được sử dụng!");
		}

		// Kiểm tra OTP gửi về mail đã được xác thực chưa (used = true)
		emailOtpRepo.findTopByEmailAndPurposeAndUsedTrueOrderByCreatedAtDesc(req.email(), "REGISTER")
					.orElseThrow(() -> new IllegalArgumentException("Email chưa được xác thực. Vui lòng xác thực mã OTP trước khi đăng ký!"));

		Role role = roleRepo.findByName(req.role())
				.orElseThrow(() -> new IllegalArgumentException("Không tìm thấy vai trò: " + req.role()));

		User newUser = new User();
		newUser.setUsername(req.username());
		newUser.setFullName(req.fullName());
		newUser.setEmail(req.email());
		newUser.setPhone(req.phone());
		newUser.setRequestedApartmentCode(req.requestedApartmentCode());

		// Mã hóa mật khẩu từ DTO
		newUser.setPasswordHash(passwordEncoder.encode(req.password()));

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

		// 3. Gán hộ dân dựa trên mã căn hộ mà cư dân đã yêu cầu khi đăng ký.
		//    Nhờ vậy luồng thanh toán/tra cứu theo hộ của cư dân mới hoạt động được.
		linkHouseholdByRequestedApartment(user);

		// 4. Duyệt tài khoản
		user.setActive(true);

		// 5. Lưu thay đổi
		return userRepo.saveAndFlush(user);
	}

	/**
	 * Tìm căn hộ theo requestedApartmentCode → lấy hộ dân ACTIVE đang ở căn hộ đó → gán vào user.
	 * Ném lỗi rõ ràng nếu không xác định được hộ, để Admin xử lý thay vì duyệt một tài khoản "mồ côi hộ".
	 */
	private void linkHouseholdByRequestedApartment(User user) {
		String code = user.getRequestedApartmentCode();
		if (code == null || code.isBlank()) {
			throw new IllegalArgumentException(
					"Tài khoản chưa khai báo mã căn hộ. Không thể gán hộ dân khi duyệt.");
		}

		Apartment apartment = apartmentRepo.findByCode(code.trim())
				.orElseThrow(() -> new IllegalArgumentException(
						"Không tìm thấy căn hộ với mã '" + code + "' mà cư dân đã yêu cầu."));

		Household household = householdRepo
				.findByApartmentIdAndStatus(apartment.getId(), HouseholdStatus.ACTIVE)
				.orElseThrow(() -> new IllegalArgumentException(
						"Căn hộ '" + code + "' chưa có hộ dân đang cư trú (ACTIVE). "
								+ "Hãy gán hộ vào căn hộ trước khi duyệt tài khoản."));

		user.setHousehold(household);
	}

	// Đăng nhập hệ thống và cấp phát JWT
	public LoginResponseDTO login(LoginRequest req) {
		// 1. Tìm user
		User user = userRepo.findByUsername(req.username())
				.orElseThrow(() -> new BadCredentialsException("Tên đăng nhập hoặc mật khẩu không chính xác"));

		// 2. So khớp mật khẩu
		boolean isMatch = passwordEncoder.matches(req.password(), user.getPasswordHash());

		if (!isMatch) {
			throw new BadCredentialsException("Tên đăng nhập hoặc mật khẩu không chính xác");
		}

		// 3. Kiểm tra trạng thái kích hoạt (cờ active)
		if (!user.isActive()) {
			throw new DisabledException("Tài khoản của bạn chưa được duyệt hoặc đã bị khóa");
		}

		// 4. Sinh JWT Token thông qua Provider
		String accessToken = jwtTokenProvider.generateToken(user);

		// 5. Trích xuất Household ID (nếu tài khoản đã được gán vào hộ dân)
		Long householdId = user.getHousehold() != null ? user.getHousehold().getId() : null;

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

	// Xử lý gửi OTP Quên mật khẩu
	public void processForgotPasswordOtp(String email) {
		// Theo SDD: Kiểm tra xem email có tồn tại không
		boolean emailExists = userRepo.existsByEmail(email);

		if (emailExists) {
			// Nếu có, sinh OTP và gửi mail
			OtpRequest otpRequest = new OtpRequest(email); //, "FORGOT_PASSWORD");
			String plainOtp = otpService.generateAndSaveOtp(otpRequest, "FORGOT_PASSWORD");
			emailService.sendOtpEmail(email, plainOtp, "FORGOT_PASSWORD");
		}
		// Nếu không tồn tại: không làm gì cả để tránh bị dò quét email.
		// Controller vẫn sẽ trả về thông báo thành công chung chung.
	}

	// Đặt lại mật khẩu
	@Transactional
	public void resetPassword(ResetPasswordRequest request) {
		// 1. Kiểm tra mật khẩu mới và xác nhận
		if (!request.newPassword().equals(request.confirmNewPassword())) {
			throw new IllegalArgumentException("Mật khẩu mới và xác nhận mật khẩu không khớp!");
		}

		// 2. Xác thực OTP (OtpService sẽ tự động đánh dấu used = true nếu hợp lệ)
		VerifyOtpRequest verifyReq = new VerifyOtpRequest(request.email(), request.otp());
		boolean isOtpValid = otpService.verifyOtp(verifyReq, "FORGOT_PASSWORD");
		if (!isOtpValid) {
			throw new IllegalArgumentException("Mã OTP không hợp lệ.");
		}

		// 3. Tìm tài khoản
		User user = userRepo.findByEmail(request.email())
				.orElseThrow(() -> new IllegalArgumentException("Không tìm thấy tài khoản với email này."));

		// 4. Mã hoá và lưu mật khẩu mới
		user.setPasswordHash(passwordEncoder.encode(request.newPassword()));
		userRepo.save(user);
	}
}