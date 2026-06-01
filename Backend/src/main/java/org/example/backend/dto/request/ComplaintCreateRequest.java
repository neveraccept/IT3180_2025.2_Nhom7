package org.example.backend.dto.request;

import org.example.backend.entity.enums.ComplaintCategory;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record ComplaintCreateRequest(
        @NotBlank(message = "Tiêu đề không được để trống")
        @Size(max = 200, message = "Tiêu đề tối đa 200 ký tự")
        String title,

        @NotNull(message = "Loại khiếu nại không được để trống")
        ComplaintCategory category,

        @NotBlank(message = "Nội dung không được để trống")
        String content
) {
}