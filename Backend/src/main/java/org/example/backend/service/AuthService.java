package org.example.backend.service;

import org.example.backend.dto.request.*;
import org.example.backend.dto.LoginResponseDTO;
import org.example.backend.entity.Role;
import org.example.backend.entity.User;
import org.example.backend.repository.*;
import org.example.backend.security.JwtUtil;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.DisabledException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AuthService {
	private static final Logger log = LoggerFactory.getLogger(AuthService.class);

	private final UserRepository userRepo;
	private final RoleRepository roleRepo;
	private final EmailOtpRepository emailOtpRepo;
	private final PasswordEncoder passwordEncoder;
	private final JwtUtil jwtTokenProvider;
	private final OtpService otpService;
	private final EmailService emailService;

	@Autowired
	public AuthService(UserRepository userRepo,
	                   RoleRepository roleRepo,
	                   PasswordEncoder passwordEncoder,
	                   EmailOtpRepository emailOtpRepo,
	                   JwtUtil jwtTokenProvider,
	                   OtpService otpService,
	                   EmailService emailService) {
		this.userRepo = userRepo;
		this.roleRepo = roleRepo;
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

		// Kiểm tra OTP gửi về mail đã được xác thực chưa (used = true) VÀ phiên xác thực còn hiệu lực.
		// Lấy mã OTP REGISTER mới nhất đã xác thực để ràng buộc đăng ký vào đúng phiên xác thực đó,
		// tránh việc tái sử dụng một lần xác thực cũ không giới hạn thời gian.
		var verifiedOtp = emailOtpRepo
				.findTopByEmailAndPurposeAndUsedTrueOrderByCreatedAtDesc(request.email(), "REGISTER")
				.orElseThrow(() -> new IllegalArgumentException("Email chưa được xác thực. Vui lòng xác thực mã OTP trước khi đăng ký!"));

		// Cửa sổ hoàn tất đăng ký: 10 phút kể từ lúc sinh mã OTP (tách biệt với hạn xác thực OTP 5 phút).
		// Quá hạn này buộc người dùng xác thực lại để khoá chặt phiên đăng ký theo thời gian.
		java.time.LocalDateTime registrationDeadline = verifiedOtp.getCreatedAt().plusMinutes(10);
		if (java.time.LocalDateTime.now().isAfter(registrationDeadline)) {
			throw new IllegalArgumentException("Phiên xác thực đã hết hạn. Vui lòng xác thực lại mã OTP trước khi đăng ký!");
		}

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

	// Xử lý gửi OTP Quên mật khẩu
	public void processForgotPasswordOtp(String email) {
		// Theo SDD: Kiểm tra xem email có tồn tại không
		boolean emailExists = userRepo.existsByEmail(email);

		if (emailExists) {
			// Nếu có, sinh OTP và gửi mail
			OtpRequest otpRequest = new OtpRequest(email); //, "FORGOT_PASSWORD");
			String plainOtp = otpService.generateAndSaveOtp(otpRequest, "FORGOT_PASSWORD");
			try {
				emailService.sendOtpEmail(email, plainOtp, "FORGOT_PASSWORD");
			} catch (Exception e) {
				// Nuốt lỗi gửi mail (vd SMTP lỗi) và CHỈ ghi log. Nếu để lỗi lan ra,
				// client sẽ nhận 400 khi email tồn tại nhưng 200 khi email không tồn tại
				// -> lộ việc email có trong hệ thống, phá vỡ cơ chế chống dò quét email.
				log.warn("Gửi OTP quên mật khẩu thất bại: {}", e.getMessage());
			}
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
