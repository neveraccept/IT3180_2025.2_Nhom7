package org.example.backend.dto;

import org.example.backend.entity.User;

public record UserProfileDTO(
        Long id,
        String username,
        String fullName,
        String email,
        String phone,
        String role
) {
    public static UserProfileDTO fromEntity(User user) {
        if (user == null) return null;

        String roleName = (user.getRole() != null) ? user.getRole().getName() : null;

        return new UserProfileDTO(
                user.getId(),
                user.getUsername(),
                user.getFullName(),
                user.getEmail(),
                user.getPhone(),
                roleName
        );
    }
}