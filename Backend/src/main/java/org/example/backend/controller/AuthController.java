package org.example.backend.controller;

import jakarta.validation.Valid;
import org.example.backend.dto.*;
import org.example.backend.dto.request.*;
import org.example.backend.dto.response.ApiResponse;
import org.example.backend.entity.User;
import org.example.backend.security.CustomUserDetails;
import org.example.backend.service.AuthService;
import org.example.backend.service.EmailService;
import org.example.backend.service.OtpService;
import org.example.backend.service.mapper.UserMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class AuthController {
	private final OtpService otpService;
	private final EmailService emailService;
	private final AuthService authService;
	private final UserMapper mapper;

	@Autowired
	public AuthController(OtpService otpService,
						  EmailService emailService,
						  AuthService authService,
						  UserMapper mapper) {
		this.otpService = otpService;
		this.emailService = emailService;
		this.authService = authService;
		this.mapper = mapper;
	}

	// 1. API Gửi mã OTP
	@PostMapping("/send-otp")
	public ResponseEntity<?> sendOtp(@Valid @RequestBody OtpRequest request) {
		try {
			// Sinh mã OTP và băm lưu vào DB
			String plainOtp = otpService.generateAndSaveOtp(request, "REGISTER");

			// Gửi email chứa mã OTP nguyên bản
			emailService.sendOtpEmail(request.email(), plainOtp, "REGISTER");

			return ResponseEntity.ok(Map.of("message", "Mã OTP đã được gửi đến email của bạn."));
		} catch (RuntimeException e) {
			return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
		}
	}

	// 2. API Xác thực mã OTP
	@PostMapping("/verify-otp")
	public ResponseEntity<?> verifyOtp(@Valid @RequestBody VerifyOtpRequest request) {
		try {
			boolean isValid = otpService.verifyOtp(request, "REGISTER");
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
			UserDTO responseDto = mapper.toDto(createdUser);

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

	// API đăng nhập tài khoản
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

	// API Yêu cầu gửi OTP Quên mật khẩu
	@PostMapping("/forgot-password/send-otp")
	public ResponseEntity<?> sendForgotPasswordOtp(@RequestBody OtpRequest request) {
		try {
			String email = request.email();
			if (email == null || email.isBlank()) {
				return ResponseEntity.badRequest().body(Map.of("error", "Email không được để trống"));
			}

			authService.processForgotPasswordOtp(email);

			// Luôn trả về thông báo này dù email có tồn tại hay không (Anti-enumeration)
			return ResponseEntity.ok(Map.of("message", "Nếu email tồn tại trong hệ thống, mã OTP đã được gửi đến bạn."));
		} catch (RuntimeException e) {
			return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
		}
	}

	// API Đặt lại mật khẩu bằng OTP
	@PostMapping("/reset-password")
	public ResponseEntity<?> resetPassword(@Valid @RequestBody ResetPasswordRequest request) {
		try {
			authService.resetPassword(request);
			return ResponseEntity.ok(ApiResponse.ok(null, "Đặt lại mật khẩu thành công. Bạn có thể đăng nhập bằng mật khẩu mới."));
		} catch (IllegalArgumentException e) {
			return ResponseEntity.badRequest().body(ApiResponse.error("RESET_FAILED", e.getMessage()));
		} catch (RuntimeException e) {
			return ResponseEntity.badRequest().body(ApiResponse.error("RESET_FAILED", e.getMessage()));
		}
	}
}