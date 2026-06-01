package org.example.backend.exception; // Khai báo package chính xác

import org.example.backend.dto.ApiResponse;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class GlobalExceptionHandler {

    // Bắt lỗi khi 2 mật khẩu không khớp hoặc dữ liệu đầu vào sai
    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<ApiResponse<Void>> handleIllegalArgumentException(IllegalArgumentException ex) {
        ApiResponse<Void> response = new ApiResponse<>(
                false,
                null,
                ex.getMessage(),
                "400"
        );
        return ResponseEntity.badRequest().body(response);
    }

    // Bắt lỗi khi nhập sai mật khẩu cũ (từ Spring Security)
    @ExceptionHandler(BadCredentialsException.class)
    public ResponseEntity<ApiResponse<Void>> handleBadCredentialsException(BadCredentialsException ex) {
        ApiResponse<Void> response = new ApiResponse<>(
                false,
                null,
                "Mật khẩu cũ không chính xác.",
                "400"
        );
        return ResponseEntity.badRequest().body(response);
    }
}