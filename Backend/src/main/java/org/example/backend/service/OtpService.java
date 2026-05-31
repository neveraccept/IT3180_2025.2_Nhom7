package org.example.backend.service;

import org.example.backend.entity.EmailOtp;
import org.example.backend.repository.EmailOtpRepository;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Optional;
import java.util.Random;

@Service
public class OtpService {
    private final EmailOtpRepository otpRepo;
    private final EmailService emailService;
    private final BCryptPasswordEncoder passwordEncoder;
    private final Random random = new Random();

    private static final int OTP_LENGTH = 6;
    private static final int OTP_EXP_MINUTES = 5;
    private static final int RATE_LIMIT_COUNT = 5; // max sends per window
    private static final int RATE_LIMIT_MINUTES = 15;

    public OtpService(EmailOtpRepository otpRepo, EmailService emailService, BCryptPasswordEncoder passwordEncoder) {
        this.otpRepo = otpRepo;
        this.emailService = emailService;
        this.passwordEncoder = passwordEncoder;
    }

    @Transactional
    public void sendOtp(String email, String purpose) {
        LocalDateTime window = LocalDateTime.now().minusMinutes(RATE_LIMIT_MINUTES);
        long sentCount = otpRepo.countByEmailCreatedAfter(email, window);
        if (sentCount >= RATE_LIMIT_COUNT) {
            // Thay đổi thông báo ngoại lệ chuẩn theo tài liệu thiết kế (NFR-11)
            throw new IllegalStateException("Vui lòng thử lại sau");
        }

        String otp = generateNumericOtp(OTP_LENGTH);
        String otpHash = passwordEncoder.encode(otp);

        EmailOtp e = new EmailOtp();
        e.setEmail(email);
        e.setOtpHash(otpHash);
        e.setPurpose(purpose);
        e.setExpiredAt(LocalDateTime.now().plusMinutes(OTP_EXP_MINUTES));
        e.setUsed(false);
        e.setFailedAttempts(0);
        e.setCreatedAt(LocalDateTime.now());
        otpRepo.save(e);

        emailService.sendOtpEmail(email, otp);
    }

    private String generateNumericOtp(int len) {
        int bound = (int) Math.pow(10, len - 1);
        int num = bound + random.nextInt(9 * bound);
        return String.valueOf(num);
    }

    @Transactional
    public boolean verifyOtp(String email, String otp, String purpose) {
        Optional<EmailOtp> maybe = otpRepo.findTopByEmailAndPurposeOrderByCreatedAtDesc(email, purpose);
        if (maybe.isEmpty()) {
            throw new IllegalArgumentException("Mã OTP không tồn tại");
        }
        EmailOtp e = maybe.get();

        // 1. Kiểm tra OTP đã sử dụng chưa
        if (e.isUsed()) {
            throw new IllegalArgumentException("Mã OTP đã dùng, vui lòng yêu cầu mã mới");
        }

        // 2. Kiểm tra thời gian hết hạn
        if (e.getExpiredAt().isBefore(LocalDateTime.now())) {
            throw new IllegalArgumentException("Mã OTP đã hết hạn");
        }

        // 3. Kiểm tra xem mã đã bị khóa từ trước chưa
        if (e.getFailedAttempts() >= 5) {
            throw new IllegalArgumentException("Mã OTP đã bị khóa do nhập sai quá 5 lần. Vui lòng yêu cầu mã mới");
        }

        // 4. Đối chiếu mã OTP người dùng nhập với mã Hash trong CSDL
        if (!passwordEncoder.matches(otp, e.getOtpHash())) {
            e.setFailedAttempts(e.getFailedAttempts() + 1);
            otpRepo.save(e); // Lưu ngay trạng thái số lần sai

            // UX Tinh chỉnh: Ném ngoại lệ khóa mã NGAY LẬP TỨC khi chạm mốc 5 lần
            if (e.getFailedAttempts() >= 5) {
                throw new IllegalArgumentException("Mã OTP đã bị khóa do nhập sai quá 5 lần. Vui lòng yêu cầu mã mới");
            }
            throw new IllegalArgumentException("Mã OTP không đúng");
        }

        // 5. Thành công: Đánh dấu mã đã sử dụng và lưu lại
        e.setUsed(true);
        otpRepo.save(e);

        return true;
    }
}