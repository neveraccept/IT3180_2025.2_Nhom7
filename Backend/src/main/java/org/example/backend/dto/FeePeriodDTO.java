package org.example.backend.dto;

import lombok.Data;
import java.time.LocalDate;

@Data
public class FeePeriodDTO {
    private Long id;
    private Long feeId;
    private String name;
    private LocalDate startDate;
    private LocalDate endDate;
    private String status; // OPEN, CLOSED
}
