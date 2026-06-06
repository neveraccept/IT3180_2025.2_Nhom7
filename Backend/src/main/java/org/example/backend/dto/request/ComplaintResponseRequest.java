package org.example.backend.dto.request;

import org.example.backend.entity.enums.ComplaintStatus;
import jakarta.validation.constraints.NotNull;

/**
 * Dùng cho F8.3 (phản hồi) và F8.4 (đánh dấu đã xử lý).
 * status mục tiêu chỉ được là IN_PROGRESS / RESOLVED / REJECTED (validate ở Service).
 *
 * response để trống được: cho phép admin chỉ chuyển trạng thái (VD: NEW → IN_PROGRESS)
 * mà chưa cần nhập nội dung phản hồi. Khi response null/blank, Service giữ nguyên
 * nội dung phản hồi đã có (nếu có).
 */
public record ComplaintResponseRequest(
        String response,

        @NotNull(message = "Trạng thái xử lý không được để trống")
        ComplaintStatus status
) {
}