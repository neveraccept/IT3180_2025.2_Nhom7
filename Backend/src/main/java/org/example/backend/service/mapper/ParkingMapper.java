package org.example.backend.service.mapper;

import org.example.backend.dto.ParkingRegistrationDTO;
import org.example.backend.dto.ParkingSlotDTO;
import org.example.backend.entity.Household;
import org.example.backend.entity.ParkingRegistration;
import org.example.backend.entity.ParkingSlot;
import org.example.backend.entity.Vehicle;
import org.springframework.stereotype.Component;

/** Ánh xạ ParkingSlot / ParkingRegistration Entity → DTO. */
@Component
public class ParkingMapper {

    /**
     * Chuyển ParkingSlot + lượt đăng ký ACTIVE hiện tại (nếu có) thành DTO.
     * licensePlate và householdCode được lấy từ xe đang gán vào chỗ này.
     * Nếu chỗ EMPTY hoặc đang cho thuê ngoài (vehicle == null) thì 2 trường trên là null.
     *
     * @param s         entity chỗ gửi xe
     * @param activeReg lượt đăng ký ACTIVE đang chiếm chỗ này, hoặc null nếu EMPTY
     */
    public ParkingSlotDTO toSlotDto(ParkingSlot s, ParkingRegistration activeReg) {
        String licensePlate = null;
        String householdCode = null;
        if (activeReg != null) {
            Vehicle v = activeReg.getVehicle();
            if (v != null) {
                licensePlate = v.getLicensePlate();
                // Household lazy-load: an toàn vì method này được gọi trong @Transactional
                Household hh = v.getHousehold();
                if (hh != null) {
                    householdCode = hh.getCode();
                }
            }
        }
        return new ParkingSlotDTO(
                s.getId(), s.getCode(), s.getType(), s.getStatus(),
                licensePlate, householdCode);
    }

    public ParkingRegistrationDTO toRegistrationDto(ParkingRegistration r) {
        Vehicle v = r.getVehicle();
        return new ParkingRegistrationDTO(
                r.getId(),
                r.getSlot() != null ? r.getSlot().getId() : null,
                r.getSlot() != null ? r.getSlot().getCode() : null,
                v != null ? v.getId() : null,
                v != null ? v.getLicensePlate() : null,
                r.getRenterName(),
                r.getRenterPhone(),
                r.getStartDate(),
                r.getEndDate(),
                r.getMonthlyFee(),
                r.getStatus()
        );
    }
}
