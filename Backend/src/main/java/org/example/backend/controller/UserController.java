package org.example.backend.controller;

import jakarta.validation.Valid;
import org.example.backend.dto.ApiResponse;
import org.example.backend.dto.CreateUserRequest; // BỔ SUNG IMPORT NÀY
import org.example.backend.dto.UserDTO;
import org.example.backend.entity.User;
import org.example.backend.service.UserService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/users")
public class UserController {

    private final UserService userService;

    // Inject UserService thay vì AuthService
    public UserController(UserService userService) {
        this.userService = userService;
    }

    /**
     * POST /api/users
     * Mục đích: Admin tạo tài khoản nội bộ (ADMIN hoặc RESIDENT)
     */
    @PostMapping
    public ResponseEntity<?> createInternalAccount(@Valid @RequestBody CreateUserRequest req) {
        // LƯU Ý Ở TRÊN: Thay @RequestBody User thành @RequestBody CreateUserRequest

        try {
            // Gọi logic từ UserService (lúc này UserService cũng đã nhận CreateUserRequest)
            User createdUser = userService.createInternalAccount(req);

            // Ép sang UserDTO trước khi trả về để bảo mật thông tin theo tài liệu SDD
            UserDTO responseDto = UserDTO.fromEntity(createdUser);

            return ResponseEntity.status(201).body(ApiResponse.ok(responseDto, "Tạo tài khoản nội bộ thành công"));

        } catch (IllegalArgumentException ex) {
            if ("USERNAME_EXISTS".equals(ex.getMessage())) {
                return ResponseEntity.badRequest().body(ApiResponse.error("USERNAME_EXISTS", "Tên đăng nhập đã tồn tại"));
            }
            return ResponseEntity.badRequest().body(ApiResponse.error("CREATE_USER_FAILED", ex.getMessage()));
        } catch (Exception ex) {
            return ResponseEntity.internalServerError().body(ApiResponse.error("SERVER_ERROR", "Đã xảy ra lỗi hệ thống, vui lòng thử lại sau"));
        }
    }

    /**
     * PUT /api/users/{id}/approve
     * Mục đích: Admin duyệt tài khoản cư dân đăng ký
     */
    @PutMapping("/{id}/approve")
    public ResponseEntity<?> approveResidentAccount(@PathVariable Long id) {
        try {
            // Gọi logic từ UserService
            User approvedUser = userService.approveResidentAccount(id);

            // Ép sang UserDTO trước khi trả về
            UserDTO responseDto = UserDTO.fromEntity(approvedUser);

            return ResponseEntity.ok(ApiResponse.ok(responseDto, "Duyệt tài khoản cư dân thành công"));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(ApiResponse.error("APPROVE_FAILED", ex.getMessage()));
        } catch (Exception ex) {
            return ResponseEntity.internalServerError().body(ApiResponse.error("SERVER_ERROR", "Đã xảy ra lỗi hệ thống khi duyệt tài khoản"));
        }
    }
}