package org.example.backend.service.mapper;

import org.example.backend.dto.UtilityBillDTO;
import org.example.backend.entity.UtilityBill;
import org.springframework.stereotype.Component;

/** Ánh xạ UtilityBill Entity → DTO. */
@Component
public class UtilityBillMapper {

    public UtilityBillDTO toDto(UtilityBill b) {
        return new UtilityBillDTO(
                b.getId(),
                b.getHousehold() != null ? b.getHousehold().getId() : null,
                b.getHousehold() != null ? b.getHousehold().getCode() : null,
                b.getType(),
                b.getMonth(),
                b.getYear(),
                b.getOldIndex(),
                b.getNewIndex(),
                b.getAmount(),
                b.getStatus(),
                b.getPaidDate(),
                b.getPaymentMethod(),
                b.getTransactionCode(),
                b.getPaidAt()
        );
    }
}
