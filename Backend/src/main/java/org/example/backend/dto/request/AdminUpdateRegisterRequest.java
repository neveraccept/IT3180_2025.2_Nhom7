package org.example.backend.dto.request;

public record AdminUpdateRegisterRequest(
        String fullName,
        String phone,
        String requestedApartmentCode
) {
}