package org.example.backend.controller;

import jakarta.validation.Valid;
import org.example.backend.dto.*;
import org.example.backend.dto.request.*;
import org.example.backend.dto.response.ApiResponse;
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
			// Sinh mã OTP và băm lưu vào DB
			String plainOtp = otpService.generateAndSaveOtp(request);

			// Gửi email chứa mã OTP nguyên bản
			emailService.sendOtpEmail(request.email(), plainOtp, request.purpose());

			return ResponseEntity.ok(Map.of("message", "Mã OTP đã được gửi đến email của bạn."));
		} catch (RuntimeException e) {
			return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
		}
	}

	// 2. API Xác thực mã OTP
	@PostMapping("/verify-otp")
	public ResponseEntity<?> verifyOtp(@Valid @RequestBody VerifyOtpRequest request) {
		try {
			boolean isValid = otpService.verifyOtp(request);
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
	public ResponseEntity<?> register(@Valid @RequestBody RegisterRequest request) {
		try {
			// Gọi hàm đăng ký từ AuthService
			User createdUser = authService.registerResident(request);

			// Chuyển Entity sang DTO để ẩn thông tin nhạy cảm (như passwordHash)
			UserDTO responseDto = UserDTO.fromEntity(createdUser);

			return ResponseEntity.status(201).body(ApiResponse.ok(responseDto, "Đăng ký thành công, vui lòng chờ Ban quản trị duyệt."));

		} catch (IllegalArgumentException ex) {
			String errorMsg = ex.getMessage();
			String errorCode = "CREATE_USER_FAILED"; // Mã mặc định

			// Phân loại mã lỗi (ErrorCode) dựa trên thông điệp thực tế từ AuthService
			if (errorMsg.contains("Tên đăng nhập đã tồn tại")) {
				errorCode = "USERNAME_EXISTS";
			} else if (errorMsg.contains("Email đã được sử dụng")) {
				errorCode = "EMAIL_EXISTS";
			} else if (errorMsg.contains("Email chưa được xác thực")) {
				errorCode = "EMAIL_NON_VERIFIED";
			} else if (errorMsg.contains("Mật khẩu xác nhận không khớp")) {
				errorCode = "PASSWORD_MISMATCH";
			} else if (errorMsg.contains("quyền cư dân")) {
				errorCode = "ROLE_NOT_FOUND";
			}

			// Trả về HTTP 400 kèm mã lỗi hệ thống
			return ResponseEntity.badRequest().body(ApiResponse.error(errorCode, errorMsg));

		} catch (Exception ex) {
			// Lỗi 500: Các lỗi bất ngờ từ Server (ví dụ: đứt kết nối Database)
			return ResponseEntity.internalServerError().body(ApiResponse.error("SERVER_ERROR", "Đã xảy ra lỗi hệ thống, vui lòng thử lại sau"));
		}
	}

	@PostMapping("createAccount")
	public ResponseEntity<?> createInternalAccount(@Valid @RequestBody AdminRegisterRequest req) {
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
	public ResponseEntity<?> login(@Valid @RequestBody LoginRequest req) {
		try {
			// AuthService sẽ chịu trách nhiệm kiểm tra thông tin và sinh ra token
			LoginResponseDTO tokenResponse = authService.login(req);

			return ResponseEntity.ok(ApiResponse.ok(tokenResponse, "Đăng nhập thành công"));

		} catch (org.springframework.security.authentication.BadCredentialsException ex) {
			// Lỗi sai username hoặc password (thường do Spring Security ném ra)
			return ResponseEntity.status(401).body(ApiResponse.error("UNAUTHORIZED", "Tên đăng nhập hoặc mật khẩu không chính xác"));

		} catch (org.springframework.security.authentication.DisabledException ex) {
			// Lỗi tài khoản chưa được kích hoạt (cờ active = false / chưa được BQT duyệt)
			return ResponseEntity.status(403).body(ApiResponse.error("ACCOUNT_DISABLED", "Tài khoản của bạn chưa được duyệt hoặc đã bị khóa"));

		} catch (Exception ex) {
			// Các lỗi hệ thống khác
			return ResponseEntity.internalServerError().body(ApiResponse.error("SERVER_ERROR", "Đã xảy ra lỗi hệ thống, vui lòng thử lại sau"));
		}
	}
}