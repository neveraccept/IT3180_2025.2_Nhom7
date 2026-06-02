package org.example.backend.service.mapper;

import org.example.backend.dto.UserDTO;
import org.example.backend.entity.User;
import org.springframework.stereotype.Component;

/** Ánh xạ User Entity → DTO. */
@Component
public class UserMapper {

    public UserDTO toDto(User user) {
        return new UserDTO(
                user.getId(),
                user.getUsername(),
                user.getFullName(),
                user.getEmail(),
                user.getPhone(),
                user.isActive(),
                user.isEmailVerified(),
                user.getRequestedApartmentCode(),
                user.getHousehold() != null ? user.getHousehold().getId() : null,
                user.getRole() != null ? user.getRole().getName() : null
        );
    }
}
