package org.example.backend.dto;

import lombok.Data;

import java.math.BigDecimal;

@Data
public class SystemConfigDTO {
    private Long id;
    private String configKey;
    private BigDecimal configValue;
    private String description;
}
