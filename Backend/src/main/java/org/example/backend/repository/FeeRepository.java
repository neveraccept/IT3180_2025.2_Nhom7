package org.example.backend.repository;

import org.example.backend.entity.Fee;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface FeeRepository extends JpaRepository<Fee, Long> {
    boolean existsByName(String name); // Kiểm tra nếu có khoản thu bị trùng tên

    Optional<Fee> findByName(String name); // Tra khoản thu theo tên (vd: khoản "Phí gửi xe" hệ thống)

    @Query("SELECT f FROM Fee f WHERE " +
           "(:keyword IS NULL OR LOWER(f.name) LIKE LOWER(CONCAT('%', :keyword, '%'))) " +
           "AND (:type IS NULL OR f.type = :type) " +
           "AND (:active IS NULL OR f.active = :active)")
    Page<Fee> searchFees(@Param("keyword") String keyword,
                         @Param("type") String type,
                         @Param("active") Boolean active,
                         Pageable pageable);
}