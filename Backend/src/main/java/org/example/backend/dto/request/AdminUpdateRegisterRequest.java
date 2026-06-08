package org.example.backend.dto.request;

public record AdminUpdateRegisterRequest(
        String username,
        String fullName,
        String email,
        String phone,
        String requestedApartmentCode,
        String role
) {
}
