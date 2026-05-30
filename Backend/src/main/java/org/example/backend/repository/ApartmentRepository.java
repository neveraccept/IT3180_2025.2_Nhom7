package org.example.backend.repository;

import org.example.backend.entity.Apartment;
import org.example.backend.entity.enums.ApartmentStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface ApartmentRepository extends JpaRepository<Apartment, Long> {

    Optional<Apartment> findByCode(String code);

    boolean existsByCode(String code);

   //tìm kiếm căn hộ
    
    @Query("""
            SELECT DISTINCT a FROM Apartment a
            LEFT JOIN Household h ON h.apartment = a AND h.status = 'ACTIVE'
            LEFT JOIN h.headOfHousehold r
            WHERE (:code IS NULL OR LOWER(a.code) LIKE LOWER(CONCAT('%', :code, '%')))
              AND (:floor IS NULL OR a.floor = :floor)
              AND (:status IS NULL OR a.status = :status)
              AND (:headName IS NULL OR LOWER(r.fullName) LIKE LOWER(CONCAT('%', :headName, '%')))
            """)
    Page<Apartment> search(@Param("code") String code,
                           @Param("floor") Integer floor,
                           @Param("status") ApartmentStatus status,
                           @Param("headName") String headName,
                           Pageable pageable);
}


