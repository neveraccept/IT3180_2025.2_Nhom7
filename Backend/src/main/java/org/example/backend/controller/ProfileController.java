package org.example.backend.controller;

import jakarta.validation.Valid;
import org.example.backend.dto.request.ChangePasswordRequest;
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
@RequestMapping("/api/me")
public class ProfileController {

    private final ProfileService profileService;

    public ProfileController(ProfileService profileService) {
        this.profileService = profileService;
    }

    // API: Lấy thông tin hồ sơ cá nhân
    @GetMapping("/profile")
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
    @PutMapping("/profile/update")
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



    // API đổi mật khẩu
    @PutMapping("/password")
    public ResponseEntity<ApiResponse<Void>> changePassword(
            @AuthenticationPrincipal CustomUserDetails currentUser,
            @Valid @RequestBody ChangePasswordRequest request) {

        // 1. Gọi Service Layer xử lý logic đổi mật khẩu
        profileService.changePassword(currentUser.getId(), request);

        // 2. Bọc kết quả vào cấu trúc ApiResponse chuẩn hóa của dự án
        ApiResponse<Void> response = new ApiResponse<>(
                true,
                null,
                "Đổi mật khẩu thành công.",
                "200"
        );

        return ResponseEntity.ok(response);
    }
}