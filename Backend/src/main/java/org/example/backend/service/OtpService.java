package org.example.backend.service;

import org.example.backend.dto.request.OtpRequest;
import org.example.backend.dto.request.VerifyOtpRequest;
import org.example.backend.entity.EmailOtp;
import org.example.backend.repository.EmailOtpRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Optional;
import java.util.Random;

@Service
public class OtpService {

    private final EmailOtpRepository emailOtpRepo;
    private final PasswordEncoder passwordEncoder;

    @Autowired
    public OtpService(EmailOtpRepository emailOtpRepo, PasswordEncoder passwordEncoder) {
        this.emailOtpRepo = emailOtpRepo;
        this.passwordEncoder = passwordEncoder;
    }

    /**
     * Sinh và lưu mã OTP mới vào cơ sở dữ liệu
     */
    @Transactional
    public String generateAndSaveOtp(OtpRequest request, String purposeRequest) {
        // Trích xuất dữ liệu trực tiếp từ DTO
        String email = request.email();

        // Áp dụng rate-limit: Tối đa 5 lần gửi trong 15 phút
        int recentRequests = emailOtpRepo.countRecentOtps(email);
        if (recentRequests >= 5) {
            throw new RuntimeException("Vui lòng thử lại sau. Bạn đã vượt quá số lần yêu cầu OTP cho phép.");
        }

        // Tạo hàm sinh mã OTP ngẫu nhiên gồm 6 chữ số
        String plainOtp = String.format("%06d", new Random().nextInt(999999));

        // Băm mã OTP bằng BCrypt trước khi lưu vào cơ sở dữ liệu
        String hashedOtp = passwordEncoder.encode(plainOtp);

        // Lưu thông tin xuống DB
        EmailOtp emailOtp = EmailOtp.builder()
                .email(email)
                .otpHash(hashedOtp)
                .purpose(purposeRequest)
                .expiredAt(LocalDateTime.now().plusMinutes(5))
                .used(false)
                .failedAttempts(0)
                .build();

        emailOtpRepo.save(emailOtp);

        // Trả về mã gốc để AuthController chuyển cho EmailService gửi đi (không trả về cho client)
        return plainOtp;
    }

    /**
     * Xác thực mã OTP người dùng nhập vào
     */
    @Transactional
    public boolean verifyOtp(VerifyOtpRequest request, String purposeRequest) {
        // Trích xuất dữ liệu trực tiếp từ DTO
        String email = request.email();
        String plainOtp = request.otp();

        // Lấy mã OTP mới nhất theo email và mục đích sử dụng
        Optional<EmailOtp> optionalOtp = emailOtpRepo
                .findTopByEmailAndPurposeOrderByCreatedAtDesc(email, purposeRequest);

        if (optionalOtp.isEmpty()) {
            throw new RuntimeException("Không tìm thấy mã OTP cho email này.");
        }

        EmailOtp otp = optionalOtp.get();

        // Kiểm tra xem OTP đã được sử dụng chưa
        if (Boolean.TRUE.equals(otp.getUsed())) {
            throw new RuntimeException("Mã OTP đã dùng, vui lòng yêu cầu mã mới.");
        }

        // Kiểm tra số lần nhập sai
        if (otp.getFailedAttempts() >= 5) {
            throw new RuntimeException("Mã OTP này đã bị khoá do nhập sai quá nhiều lần. Vui lòng yêu cầu mã mới.");
        }

        // Kiểm tra xem OTP đã hết hạn chưa
        if (LocalDateTime.now().isAfter(otp.getExpiredAt())) {
            throw new RuntimeException("Mã OTP đã hết hạn.");
        }

        // Kiểm tra chuỗi băm
        if (passwordEncoder.matches(plainOtp, otp.getOtpHash())) {
            // Nếu hợp lệ -> đánh dấu đã sử dụng
            otp.setUsed(true);
            emailOtpRepo.save(otp);
            return true;
        } else {
            // Nếu sai -> tăng số lần nhập sai
            otp.setFailedAttempts(otp.getFailedAttempts() + 1);
            emailOtpRepo.save(otp);
            return false;
        }
    }
}