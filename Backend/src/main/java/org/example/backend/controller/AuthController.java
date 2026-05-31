package org.example.backend.controller;

import org.example.backend.dto.RegisterRequestDTO;
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
    public ResponseEntity<?> sendOtp(@RequestBody Map<String, String> request) {
        try {
            String email = request.get("email");
            String purpose = request.get("purpose"); // Nhận purpose: "REGISTER" từ body

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
    public ResponseEntity<?> verifyOtp(@RequestBody Map<String, String> request) {
        try {
            String email = request.get("email");
            String otp = request.get("otp");
            String purpose = request.get("purpose");

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
}