package org.example.backend.controller;

import jakarta.validation.Valid;
import org.example.backend.dto.response.ApiResponse;
import org.example.backend.dto.request.UpdateProfileRequest;
import org.example.backend.dto.UserProfileDTO;
// Đảm bảo import đúng đường dẫn của CustomUserDetails dự án bạn
import org.example.backend.security.CustomUserDetails;
import org.example.backend.service.ProfileService;
import org.springframework.context.annotation.Profile;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth/me/profile")
public class ProfileController {

    private final ProfileService profileService;

    public ProfileController(ProfileService profileService) {
        this.profileService = profileService;
    }

    // API: Lấy thông tin hồ sơ cá nhân
    @GetMapping
    public ResponseEntity<ApiResponse<UserProfileDTO>> getMyProfile(
            @AuthenticationPrincipal CustomUserDetails currentUser) {
        // Lấy userId từ token JWT đã được filter parse vào CustomUserDetails
        Long userId = currentUser.getId();

        // Gọi service xử lý nghiệp vụ và map sang DTO
        UserProfileDTO userProfile = profileService.getUserProfile(userId);
        return ResponseEntity.ok(
                ApiResponse.ok(userProfile, "Lấy thông tin cá nhân thành công")
        );    }

    // API: Cập nhật thông tin cá nhân
    @PutMapping
    public ResponseEntity<ApiResponse<UserProfileDTO>> updateMyProfile(
            @AuthenticationPrincipal CustomUserDetails currentUser,
            @Valid @RequestBody UpdateProfileRequest request) {

        Long userId = currentUser.getId();

        // Gọi service để cập nhật và trả về DTO mới
        UserProfileDTO updatedProfile = profileService.updateProfile(userId, request);

        return ResponseEntity.ok(
                ApiResponse.ok(updatedProfile, "Cập nhật thông tin cá nhân thành công")
        );
    }
}