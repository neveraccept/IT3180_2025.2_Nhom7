package org.example.backend.controller;

import jakarta.validation.Valid;
import org.example.backend.dto.*;
import org.example.backend.entity.User;
import org.example.backend.service.AuthService;
import org.example.backend.service.OtpService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
public class AuthController {
	private final OtpService otpService;
	private final AuthService authService;

	public AuthController(OtpService otpService, AuthService authService) {
		this.otpService = otpService;
		this.authService = authService;
	}

	@PostMapping("/send-otp")
	public ResponseEntity<?> sendOtp(@Valid @RequestBody OtpRequest req) {
		try {
			otpService.sendOtp(req.getEmail(), req.getPurpose());
			return ResponseEntity.ok(ApiResponse.ok(null, "Gửi mã OTP thành công"));
		} catch (IllegalStateException ex) {
			if ("TOO_MANY_REQUESTS".equals(ex.getMessage())) {
				return ResponseEntity.status(429).body(ApiResponse.error("TOO_MANY_OTP_REQUESTS", "Vui lòng thử lại sau"));
			}
			return ResponseEntity.badRequest().body(ApiResponse.error("SEND_OTP_FAILED", ex.getMessage()));
		} catch (Exception ex) {
			return ResponseEntity.internalServerError().body(ApiResponse.error("SERVER_ERROR", "Đã xảy ra lỗi hệ thống, vui lòng thử lại sau"));
		}
	}

	@PostMapping("/verify-otp")
	public ResponseEntity<?> verifyOtp(@Valid @RequestBody VerifyOtpRequest req) {
		try {
			otpService.verifyOtp(req.getEmail(), req.getOtp(), req.getPurpose());
			return ResponseEntity.ok(ApiResponse.ok(null, "Xác thực OTP thành công"));
		} catch (IllegalArgumentException ex) {
			String m = ex.getMessage();
			String code = "OTP_INVALID";
			String msg = "Mã OTP không đúng";

			if ("OTP_EXPIRED".equals(m)) {
				code = "OTP_EXPIRED";
				msg = "Mã OTP đã hết hạn";
			} else if ("OTP_ALREADY_USED".equals(m)) {
				code = "OTP_USED";
				msg = "Mã OTP đã dùng, vui lòng yêu cầu mã mới";
			} else if ("OTP_LOCKED".equals(m)) {
				code = "OTP_LOCKED";
				msg = "Mã OTP đã bị khoá, vui lòng yêu cầu mã mới";
			}
			return ResponseEntity.badRequest().body(ApiResponse.error(code, msg));
		} catch (Exception ex) {
			return ResponseEntity.internalServerError().body(ApiResponse.error("SERVER_ERROR", "Đã xảy ra lỗi hệ thống, vui lòng thử lại sau"));
		}
	}

	@PostMapping("/register")
	public ResponseEntity<?> register(@Valid @RequestBody RegisterRequest req) {
		try {
			User u = authService.registerResident(req);

			// Chuyển sang DTO thay vì trả trực tiếp Entity
			UserDTO responseDto = UserDTO.fromEntity(u);

			return ResponseEntity.status(201).body(ApiResponse.ok(responseDto, "Đăng ký thành công, vui lòng chờ Ban quản trị duyệt"));
		} catch (IllegalArgumentException ex) {
			if ("USERNAME_EXISTS".equals(ex.getMessage())) {
				return ResponseEntity.badRequest().body(ApiResponse.error("USERNAME_EXISTS", "Username đã tồn tại"));
			}
			return ResponseEntity.badRequest().body(ApiResponse.error("REGISTER_FAILED", ex.getMessage()));
		} catch (IllegalStateException ex) {
			if ("OTP_NOT_VERIFIED".equals(ex.getMessage())) {
				return ResponseEntity.badRequest().body(ApiResponse.error("OTP_NOT_VERIFIED", "Vui lòng xác thực email bằng OTP trước khi đăng ký"));
			}
			return ResponseEntity.badRequest().body(ApiResponse.error("REGISTER_FAILED", ex.getMessage()));
		} catch (Exception ex) {
			return ResponseEntity.internalServerError().body(ApiResponse.error("SERVER_ERROR", "Đã xảy ra lỗi hệ thống, vui lòng thử lại sau"));
		}
	}

	@PostMapping("/login")
	public ResponseEntity<?> login(@Valid @RequestBody LoginRequest req) {
		// --- CÁC DÒNG LOG DEBUG DÀNH CHO CONTROLLER ---
		System.out.println("\n[AuthController] BẮT ĐẦU LUỒNG ĐĂNG NHẬP");
		System.out.println("[AuthController] Username client gửi lên: [" + req.getUsername() + "]");
		System.out.println("[AuthController] Password client gửi lên: [" + req.getPassword() + "]");

		try {
			System.out.println("[AuthController] Đang truyền xuống AuthService.login()...");

			// AuthService sẽ chịu trách nhiệm kiểm tra thông tin và sinh ra token
			LoginResponse tokenResponse = authService.login(req);

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