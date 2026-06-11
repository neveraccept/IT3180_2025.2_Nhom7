package org.example.backend.dto;

import org.example.backend.entity.User;

public record UserProfileDTO(
        Long id,
        String username,
        String fullName,
        String email,
        String phone,
        String role,
        String apartmentCode
) {
    public static UserProfileDTO fromEntity(User user) {
        if (user == null) return null;

        String roleName = (user.getRole() != null) ? user.getRole().getName() : null;

        // Số căn hộ: ưu tiên căn hộ thực tế của hộ dân đã được gán; nếu chưa có hộ
        // (ví dụ admin, hoặc cư dân chưa được duyệt) thì dùng mã căn hộ đã khai khi đăng ký.
        // Lưu ý: việc truy cập household.apartment là LAZY nên hàm này phải được gọi
        // trong phạm vi một transaction còn mở (xem ProfileService.getUserProfile).
        String apartmentCode = null;
        if (user.getHousehold() != null && user.getHousehold().getApartment() != null) {
            apartmentCode = user.getHousehold().getApartment().getCode();
        } else {
            apartmentCode = user.getRequestedApartmentCode();
        }

        return new UserProfileDTO(
                user.getId(),
                user.getUsername(),
                user.getFullName(),
                user.getEmail(),
                user.getPhone(),
                roleName,
                apartmentCode
        );
    }
}
