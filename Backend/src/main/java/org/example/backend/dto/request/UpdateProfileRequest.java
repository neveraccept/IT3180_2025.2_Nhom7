package org.example.backend.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.*;

@Data
public class UpdateProfileRequest {

    @NotBlank(message = "Username không được để trống")
    private String username;
    
    private String phone;
}