package org.example.backend.dto;

import lombok.Data;
import java.math.BigDecimal;

@Data
public class FeeDTO {
    private Long id;
    private String name;
    private String type;
    private BigDecimal unitPrice;
    private String unit;
    private String description;
    private Boolean active;
}