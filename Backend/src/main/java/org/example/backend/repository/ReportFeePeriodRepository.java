package org.example.backend.repository;

import org.example.backend.entity.FeePeriod;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

/**
 * Dùng để lấy thông tin đợt thu (tên đợt, tên/loại khoản thu) và kiểm tra tồn tại
 * khi sinh báo cáo F10.1 / F10.2.
 */
@Repository
public interface ReportFeePeriodRepository extends JpaRepository<FeePeriod, Long> {
}
