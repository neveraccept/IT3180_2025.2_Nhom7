package org.example.backend.controller;

import jakarta.validation.Valid;
import org.example.backend.dto.*;
import org.example.backend.entity.User;
import org.example.backend.service.AuthService;
import org.example.backend.service.EmailService;
import org.example.backend.service.OtpService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class AuthController {
	private final OtpService otpService;
	private final EmailService emailService;
	private final AuthService authService;

	@Autowired
	public AuthController(OtpService otpService, EmailService emailService, AuthService authService) {
		this.otpService = otpService;
		this.emailService = emailService;
		this.authService = authService;
	}

	// 1. API Gửi mã OTP
	@PostMapping("/send-otp")
	public ResponseEntity<?> sendOtp(@Valid @RequestBody OtpRequest request) {
		try {
			String email = request.getEmail();
			String purpose = request.getPurpose(); // Nhận purpose: "REGISTER" từ body DTO

			// Sinh mã OTP và băm lưu vào DB
			String plainOtp = otpService.generateAndSaveOtp(email, purpose);

			// Gửi email chứa mã OTP nguyên bản
			emailService.sendOtpEmail(email, plainOtp, purpose);

			return ResponseEntity.ok(Map.of("message", "Mã OTP đã được gửi đến email của bạn."));
		} catch (RuntimeException e) {
			return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
		}
	}

	// 2. API Xác thực mã OTP
	@PostMapping("/verify-otp")
	public ResponseEntity<?> verifyOtp(@Valid @RequestBody VerifyOtpRequest request) {
		try {
			String email = request.getEmail();
			String otp = request.getOtp();
			String purpose = request.getPurpose();

			boolean isValid = otpService.verifyOtp(email, otp, purpose);
			if (isValid) {
				return ResponseEntity.ok(Map.of("message", "Xác thực OTP thành công."));
			} else {
				return ResponseEntity.badRequest().body(Map.of("error", "Mã OTP không hợp lệ."));
			}
		} catch (RuntimeException e) {
			return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
		}
	}

	// 3. API Đăng ký tài khoản
	@PostMapping("/register")
	public ResponseEntity<?> register(@RequestBody RegisterRequestDTO request) {
		try {
			authService.registerResident(request);
			return ResponseEntity.ok(Map.of("message", "Đăng ký thành công, vui lòng chờ Ban quản trị duyệt."));
		} catch (RuntimeException e) {
			return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
		}
	}

	@PostMapping("createAccount")
	public ResponseEntity<?> createInternalAccount(@Valid @RequestBody AdminRegisterRequestDTO req) {
		try {
			// 1. Gọi Service để tạo tài khoản
			User createdUser = authService.createInternalAccount(req);

			// 2. Ép kiểu sang DTO để ẩn thông tin nhạy cảm
			UserDTO responseDto = UserDTO.fromEntity(createdUser);

			return ResponseEntity.status(201).body(ApiResponse.ok(responseDto, "Tạo tài khoản nội bộ thành công"));

		} catch (IllegalArgumentException ex) {
			String errorMsg = ex.getMessage();
			String errorCode = "CREATE_USER_FAILED"; // Mã mặc định

			// Phân loại mã lỗi (ErrorCode) dựa trên thông điệp từ UserService
			if (errorMsg.contains("Username")) {
				errorCode = "USERNAME_EXISTS";
			} else if (errorMsg.contains("OTP")) {
				errorCode = "EMAIL_NON_VERIFIED";
			} else if (errorMsg.contains("Email")) {
				errorCode = "EMAIL_EXISTS";
			} else if (errorMsg.contains("Mật khẩu")) {
				errorCode = "PASSWORD_MISMATCH";
			} else if (errorMsg.contains("vai trò")) {
				errorCode = "ROLE_NOT_FOUND";
			}

			// Trả về mã lỗi 400 kèm chính xác ErrorCode và câu thông báo
			return ResponseEntity.badRequest().body(ApiResponse.error(errorCode, errorMsg));

		} catch (Exception ex) {
			// Lỗi 500: Các lỗi không lường trước (như mất kết nối DB)
			return ResponseEntity.internalServerError().body(ApiResponse.error("SERVER_ERROR", "Đã xảy ra lỗi hệ thống, vui lòng thử lại sau"));
		}
	}

	/**
	 * PUT /api/users/{id}/approve
	 * Mục đích: Admin duyệt tài khoản cư dân đăng ký
	 */
	@PutMapping("/{id}/approve")
	public ResponseEntity<?> approveResidentAccount(@PathVariable Long id) {
		try {
			// Gọi logic từ UserService
			User approvedUser = authService.approveResidentAccount(id);

			// Ép sang UserDTO trước khi trả về
			UserDTO responseDto = UserDTO.fromEntity(approvedUser);

			return ResponseEntity.ok(ApiResponse.ok(responseDto, "Duyệt tài khoản cư dân thành công"));
		} catch (IllegalArgumentException ex) {
			return ResponseEntity.badRequest().body(ApiResponse.error("APPROVE_FAILED", ex.getMessage()));
		} catch (Exception ex) {
			return ResponseEntity.internalServerError().body(ApiResponse.error("SERVER_ERROR", "Đã xảy ra lỗi hệ thống khi duyệt tài khoản"));
		}
	}

	@PostMapping("/login")
	public ResponseEntity<?> login(@Valid @RequestBody LoginRequestDTO req) {
		// --- CÁC DÒNG LOG DEBUG DÀNH CHO CONTROLLER ---
		System.out.println("\n[AuthController] BẮT ĐẦU LUỒNG ĐĂNG NHẬP");
		System.out.println("[AuthController] Username client gửi lên: [" + req.getUsername() + "]");
		System.out.println("[AuthController] Password client gửi lên: [" + req.getPassword() + "]");

		try {
			System.out.println("[AuthController] Đang truyền xuống AuthService.login()...");

			// AuthService sẽ chịu trách nhiệm kiểm tra thông tin và sinh ra token
			LoginResponseDTO tokenResponse = authService.login(req);

			System.out.println("[AuthController] => THÀNH CÔNG: Mật khẩu đúng. Đang trả về token!");
			return ResponseEntity.ok(ApiResponse.ok(tokenResponse, "Đăng nhập thành công"));

		} catch (org.springframework.security.authentication.BadCredentialsException ex) {
			System.out.println("[AuthController] => BẮT ĐƯỢC LỖI 401: Ném ra BadCredentialsException (Sai mật khẩu hoặc Username)");
			// Lỗi sai username hoặc password (thường do Spring Security ném ra)
			return ResponseEntity.status(401).body(ApiResponse.error("UNAUTHORIZED", "Tên đăng nhập hoặc mật khẩu không chính xác"));

		} catch (org.springframework.security.authentication.DisabledException ex) {
			System.out.println("[AuthController] => BẮT ĐƯỢC LỖI 403: Ném ra DisabledException (Tài khoản chưa duyệt)");
			// Lỗi tài khoản chưa được kích hoạt (cờ active = false / chưa được BQT duyệt)
			return ResponseEntity.status(403).body(ApiResponse.error("ACCOUNT_DISABLED", "Tài khoản của bạn chưa được duyệt hoặc đã bị khóa"));

		} catch (Exception ex) {
			System.out.println("[AuthController] => BẮT ĐƯỢC LỖI 500: Lỗi hệ thống bất ngờ!");
			ex.printStackTrace(); // In toàn bộ chi tiết lỗi màu đỏ ra Console để tra cứu

			// Các lỗi hệ thống khác
			return ResponseEntity.internalServerError().body(ApiResponse.error("SERVER_ERROR", "Đã xảy ra lỗi hệ thống, vui lòng thử lại sau"));
		}
	}
}