package org.example.backend.dto.request;

import jakarta.validation.constraints.NotBlank;

public record UpdateProfileRequest (

    @NotBlank(message = "Username không được để trống")
    String username,
    
    String phone
) {

}