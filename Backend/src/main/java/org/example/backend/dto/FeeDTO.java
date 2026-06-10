package org.example.backend.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;
import java.math.BigDecimal;

@Data
public class FeeDTO {
    private Long id;

    @NotBlank(message = "Tên khoản thu không được để trống")
    @Size(max = 150, message = "Tên khoản thu tối đa 150 ký tự")
    private String name;

    @NotBlank(message = "Loại khoản thu không được để trống")
    private String type;

    // unitPrice/unit được chuẩn hoá & kiểm tra theo loại khoản thu (DONATION vs MANDATORY)
    // trong FeeService.normalizeAndValidate nên không ràng buộc cứng tại đây.
    private BigDecimal unitPrice;
    private String unit;
    private String description;
    private Boolean active;
}