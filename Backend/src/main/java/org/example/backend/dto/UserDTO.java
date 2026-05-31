package org.example.backend.dto;

import lombok.*;
import org.example.backend.entity.User;

@Data
public class UserDTO {
    private Long id;
    private String username;
    private String fullName;
    private String email;
    private String phone;
    private Boolean active;
    private Boolean emailVerified;
    private String requestedApartmentCode;
    private Long householdId;
    private String role;

    // Hàm tiện ích để chuyển đổi từ Entity sang DTO
    public static UserDTO fromEntity(User user) {
        if (user == null) return null;

        UserDTO dto = new UserDTO();
        dto.setId(user.getId());
        dto.setUsername(user.getUsername());
        dto.setFullName(user.getFullName());
        dto.setEmail(user.getEmail());
        dto.setPhone(user.getPhone());

        // Nếu entity của bạn dùng "Boolean active" thay vì "boolean active", lệnh dưới đây có thể là user.getActive()
        // Nếu IDE không báo lỗi đỏ, bạn cứ giữ nguyên user.isActive()
        dto.setActive(user.isActive());

        dto.setEmailVerified(user.isEmailVerified());
        dto.setRequestedApartmentCode(user.getRequestedApartmentCode());

        // TODO: Mở comment cho phần Household nếu bạn đã thiết lập quan hệ Entity User - Household
        // if (user.getHousehold() != null) {
        //     dto.setHouseholdId(user.getHousehold().getId());
        // }

        if (user.getRole() != null) {
            // Lấy đúng tên Role từ Entity thay vì gán chết chữ "RESIDENT"
            dto.setRole(user.getRole().getName());
        }

        return dto;
    }
}