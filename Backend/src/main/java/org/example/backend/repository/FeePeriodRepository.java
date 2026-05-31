package org.example.backend.repository;

import org.example.backend.entity.FeePeriod;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface FeePeriodRepository extends JpaRepository<FeePeriod, Long> {
    boolean existsByFeeId(Long feeId);
    Page<FeePeriod> findByFeeId(Long feeId, Pageable pageable);
}
