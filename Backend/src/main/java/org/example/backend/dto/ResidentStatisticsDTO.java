package org.example.backend.dto;

/**
 * F10.4 – Thống kê dân cư: số hộ ACTIVE, số nhân khẩu ACTIVE,
 * phân loại theo tình trạng cư trú (thường trú / tạm trú / tạm vắng) và giới tính.
 */
public record ResidentStatisticsDTO(
        long totalActiveHouseholds,
        long totalActiveResidents,
        long permanentCount,   // PERMANENT - thường trú
        long temporaryCount,   // TEMPORARY - tạm trú
        long absentCount,      // ABSENT    - tạm vắng
        long maleCount,
        long femaleCount,
        long otherCount
) {}
