package org.example.backend.controller;

import jakarta.validation.Valid;
import org.example.backend.dto.AccountCreatedDTO;
import org.example.backend.dto.UserDTO;
import org.example.backend.dto.request.AdminRegisterRequest;
import org.example.backend.dto.request.AdminUpdateRegisterRequest;
import org.example.backend.dto.request.ApproveAccountRequest;
import org.example.backend.dto.request.GrantAccessRequest;
import org.example.backend.dto.response.ApiResponse;
import org.example.backend.entity.User;
import org.example.backend.service.UserService;
import org.example.backend.service.mapper.UserMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/users")
public class UserController {
    private final UserService userService;
    private final UserMapper mapper;

    @Autowired
    public UserController(UserService userService, UserMapper mapper) {
        this.userService = userService;
        this.mapper = mapper;
    }

    // API tạo tài khoản nội bộ
    @PostMapping
    public ResponseEntity<?> createInternalAccount(@Valid @RequestBody AdminRegisterRequest req) {
        try {
            // 1. Gọi Service để tạo tài khoản
            User createdUser = userService.createInternalAccount(req);

            // 2. Ép kiểu sang DTO để ẩn thông tin nhạy cảm
            UserDTO responseDto = mapper.toDto(createdUser);

            return ResponseEntity.status(201).body(ApiResponse.ok(responseDto, "Tạo tài khoản nội bộ thành công"));

        } catch (IllegalArgumentException ex) {
            String errorMsg = ex.getMessage();
            String errorCode = "CREATE_USER_FAILED"; // Mã mặc định

            // Phân loại mã lỗi (ErrorCode) dựa trên thông điệp từ UserService
            if (errorMsg.contains("Username")) {
                errorCode = "USERNAME_EXISTS";
            } else if (errorMsg.contains("OTP")) {
                errorCode = "EMAIL_NON_VERIFIED";
            } else if (errorMsg.contains("Email")) {
                errorCode = "EMAIL_EXISTS";
            } else if (errorMsg.contains("Mật khẩu")) {
                errorCode = "PASSWORD_MISMATCH";
            } else if (errorMsg.contains("vai trò")) {
                errorCode = "ROLE_NOT_FOUND";
            }

            // Trả về mã lỗi 400 kèm chính xác ErrorCode và câu thông báo
            return ResponseEntity.badRequest().body(ApiResponse.error(errorCode, errorMsg));

        } catch (Exception ex) {
            // Lỗi 500: Các lỗi không lường trước (như mất kết nối DB)
            return ResponseEntity.internalServerError().body(ApiResponse.error("SERVER_ERROR", "Đã xảy ra lỗi hệ thống, vui lòng thử lại sau"));
        }
    }

    // API duyệt tài khoản. Body (tùy chọn) mang thông tin gắn/tạo nhân khẩu cho tài khoản cư dân.
    @PutMapping("/{id}/approve")
    public ResponseEntity<?> approvePendingAccount(@PathVariable Long id,
                                                   @RequestBody(required = false) ApproveAccountRequest req) {
        try {
            // Gọi logic từ UserService để duyệt tài khoản cư dân
            User approvedUser = userService.approvePendingAccount(id, req);

            // Ép sang UserDTO trước khi trả về
            UserDTO responseDto = mapper.toDto(approvedUser);

            return ResponseEntity.ok(ApiResponse.ok(responseDto, "Duyệt tài khoản cư dân thành công"));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(ApiResponse.error("APPROVE_FAILED", ex.getMessage()));
        } catch (Exception ex) {
            return ResponseEntity.internalServerError().body(ApiResponse.error("SERVER_ERROR", "Đã xảy ra lỗi hệ thống khi duyệt tài khoản"));
        }
    }

    // API từ chối (xóa) tài khoản cư dân đang chờ duyệt
    @DeleteMapping("/{id}/reject")
    public ResponseEntity<ApiResponse<Void>> rejectPendingAccount(
            @PathVariable Long id,
            @RequestParam(required = false) String reason) {

        // Gọi Service để xử lý xóa (kèm lý do từ chối nếu Admin có nhập)
        userService.rejectPendingAccount(id, reason);

        // Trả về thông báo thành công
        return ResponseEntity.ok(
                ApiResponse.ok(null, "Đã từ chối và xóa tài khoản đăng ký thành công!")
        );
    }

    // API xóa mềm tài khoản (Admin). Đặt deleted = true thay vì xóa cứng để tránh lỗi khóa ngoại.
    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteUser(@PathVariable Long id) {
        try {
            userService.deleteUser(id);
            return ResponseEntity.ok(ApiResponse.ok(null, "Xóa tài khoản thành công!"));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(ApiResponse.error("DELETE_USER_FAILED", ex.getMessage()));
        } catch (Exception ex) {
            return ResponseEntity.internalServerError().body(ApiResponse.error("SERVER_ERROR", "Đã xảy ra lỗi hệ thống khi xóa tài khoản"));
        }
    }

    // API cập nhật thông tin đăng ký của tài khoản cư dân đang chờ duyệt (Admin có thể chỉnh sửa lại thông tin trước khi duyệt)
    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<UserDTO>> updateUser(
            @PathVariable Long id,
            @RequestBody AdminUpdateRegisterRequest request) {

        UserDTO updatedUser = userService.updateAccountInfo(id, request);
        return ResponseEntity.ok(ApiResponse.ok(updatedUser, "Cập nhật thông tin tài khoản thành công!"));
    }

    // API lấy danh sách TẤT CẢ tài khoản trong hệ thống (chỉ ADMIN truy cập được — xem SecurityConfig)
    @GetMapping
    public ResponseEntity<ApiResponse<List<UserDTO>>> getAllUsers() {
        List<UserDTO> users = userService.getAllUsers();
        return ResponseEntity.ok(
                ApiResponse.ok(users, "Lấy danh sách tài khoản thành công!")
        );
    }

    // Action 3 – Cấp tài khoản đăng nhập cho một nhân khẩu sẵn có.
    @PostMapping("/grant-access")
    public ResponseEntity<?> grantAccess(@Valid @RequestBody GrantAccessRequest req) {
        try {
            AccountCreatedDTO created = userService.grantAccess(req.residentId());
            return ResponseEntity.status(201).body(
                    ApiResponse.ok(created, "Cấp tài khoản cho cư dân thành công"));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(ApiResponse.error("GRANT_ACCESS_FAILED", ex.getMessage()));
        } catch (Exception ex) {
            return ResponseEntity.internalServerError().body(
                    ApiResponse.error("SERVER_ERROR", "Đã xảy ra lỗi hệ thống khi cấp tài khoản"));
        }
    }

    // Khóa tài khoản thủ công (Admin) — active = false.
    @PutMapping("/{id}/lock")
    public ResponseEntity<?> lockUser(@PathVariable Long id) {
        try {
            UserDTO updated = userService.setUserLocked(id, true);
            return ResponseEntity.ok(ApiResponse.ok(updated, "Đã khóa tài khoản"));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(ApiResponse.error("LOCK_USER_FAILED", ex.getMessage()));
        }
    }

    // Mở khóa tài khoản thủ công (Admin) — active = true.
    @PutMapping("/{id}/unlock")
    public ResponseEntity<?> unlockUser(@PathVariable Long id) {
        try {
            UserDTO updated = userService.setUserLocked(id, false);
            return ResponseEntity.ok(ApiResponse.ok(updated, "Đã mở khóa tài khoản"));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(ApiResponse.error("UNLOCK_USER_FAILED", ex.getMessage()));
        }
    }

    // API lấy các tài khoản cần duyệt
    @GetMapping("/pending")
    public ResponseEntity<ApiResponse<List<UserDTO>>> getPendingAccounts() {
        // 1. Gọi service để lấy danh sách DTO đã được tối ưu hóa query
        List<UserDTO> pendingUsers = userService.getPendingAccounts();

        // 2. Trả về ApiResponse chuẩn kèm HTTP Status 200 OK
        return ResponseEntity.ok(
                ApiResponse.ok(pendingUsers, "Lấy danh sách tài khoản chờ duyệt thành công!")
        );
    }
}
