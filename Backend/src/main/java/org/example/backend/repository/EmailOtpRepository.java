package org.example.backend.repository;

import org.example.backend.entity.EmailOtp;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.time.LocalDateTime;
import java.util.Optional;

public interface EmailOtpRepository extends JpaRepository<EmailOtp, Long> {
    @Query("SELECT COUNT(e) FROM EmailOtp e WHERE e.email = ?1 AND e.createdAt > ?2")
    long countByEmailCreatedAfter(String email, LocalDateTime after);

    Optional<EmailOtp> findTopByEmailAndPurposeOrderByCreatedAtDesc(String email, String purpose);
}

