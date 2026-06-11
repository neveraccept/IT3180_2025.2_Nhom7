package org.example.backend.dto.request;

import org.example.backend.entity.enums.NotificationScope;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.List;

/**
 * F9.1 + F9.2. Tuỳ scope mà cần floors hoặc householdIds
 * (kiểm tra chéo trong Service vì Bean Validation thuần không đủ).
 */
public record NotificationCreateRequest(
        @NotBlank(message = "Tiêu đề không được để trống")
        @Size(max = 200, message = "Tiêu đề tối đa 200 ký tự")
        String title,

        @NotBlank(message = "Nội dung không được để trống")
        String content,

        @NotNull(message = "Phạm vi gửi không được để trống")
        NotificationScope scope,

        List<Integer> floors,        // bắt buộc khi scope = BY_FLOOR
        List<Long> householdIds      // bắt buộc khi scope = BY_HOUSEHOLD
) {
}