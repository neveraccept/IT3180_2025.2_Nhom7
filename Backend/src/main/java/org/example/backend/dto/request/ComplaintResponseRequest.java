package org.example.backend.dto.request;

import org.example.backend.entity.enums.ComplaintStatus;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

/**
 * Dùng cho F8.3 (phản hồi) và F8.4 (đánh dấu đã xử lý).
 * status mục tiêu chỉ được là IN_PROGRESS / RESOLVED / REJECTED (validate ở Service).
 */
public record ComplaintResponseRequest(
        @NotBlank(message = "Nội dung phản hồi không được để trống")
        String response,

        @NotNull(message = "Trạng thái xử lý không được để trống")
        ComplaintStatus status
) {
}