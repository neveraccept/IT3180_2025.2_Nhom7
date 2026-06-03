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
     Long householdId,
     String role
) {
}