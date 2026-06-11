package org.example.backend.dto;

import lombok.*;
import org.example.backend.entity.User;

public record UserDTO(
     Long id,
     String username,
     String fullName,
     String email,
     String phone,
     Boolean active,
     Boolean emailVerified,
     String requestedApartmentCode,
     String apartmentCode,
     Long householdId,
     String role,
     // Nhân khẩu mà tài khoản đại diện (null với tài khoản nội bộ). Phục vụ tab "Tài khoản" trong trang Căn hộ.
     Long residentId,
     String residentName
) {
}
