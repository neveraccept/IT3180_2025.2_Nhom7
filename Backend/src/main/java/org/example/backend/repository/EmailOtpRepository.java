package org.example.backend.repository;

import org.example.backend.entity.EmailOtp;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface EmailOtpRepository extends JpaRepository<EmailOtp, Long> {

    // Lấy mã OTP mới nhất của một email theo mục đích sử dụng (REGISTER hoặc FORGOT_PASSWORD)
    Optional<EmailOtp> findTopByEmailAndPurposeOrderByCreatedAtDesc(String email, String purpose);

    // Tìm OTP mới nhất ĐÃ ĐƯỢC XÁC THỰC (used = true)
    Optional<EmailOtp> findTopByEmailAndPurposeAndUsedTrueOrderByCreatedAtDesc(String email, String purpose);

    // Truy vấn đếm số lượng OTP đã gửi trong 15 phút qua để xử lý Rate Limit
    @Query(value = "SELECT COUNT(*) FROM email_otps WHERE email = :email AND created_at > (NOW() - INTERVAL 15 MINUTE)", nativeQuery = true)
    int countRecentOtps(@Param("email") String email);

    // Vô hiệu hoá toàn bộ OTP chưa dùng của một email + mục đích trước khi sinh mã mới,
    // tránh để các OTP cũ vẫn còn hiệu lực (used = false) song song với mã mới nhất.
    @Modifying
    @Query("UPDATE EmailOtp e SET e.used = true WHERE e.email = :email AND e.purpose = :purpose AND e.used = false")
    int invalidateActiveOtps(@Param("email") String email, @Param("purpose") String purpose);
}