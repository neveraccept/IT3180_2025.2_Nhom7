package org.example.backend.service;

import org.example.backend.dto.response.PageResponse;
import org.example.backend.dto.ParkingRegistrationDTO;
import org.example.backend.dto.ParkingSlotDTO;
import org.example.backend.dto.ParkingSummaryDTO;
import org.example.backend.dto.request.CreateParkingRegistrationRequest;
import org.example.backend.entity.Household;
import org.example.backend.entity.ParkingRegistration;
import org.example.backend.entity.ParkingSlot;
import org.example.backend.entity.Vehicle;
import org.example.backend.entity.enums.ParkingRegistrationStatus;
import org.example.backend.entity.enums.ParkingSlotStatus;
import org.example.backend.entity.enums.VehicleType;
import org.example.backend.exception.BadRequestException;
import org.example.backend.exception.NotFoundException;
import org.example.backend.repository.ParkingRegistrationRepository;
import org.example.backend.repository.ParkingSlotRepository;
import org.example.backend.repository.VehicleRepository;
import org.example.backend.security.CurrentUserService;
import org.example.backend.service.mapper.ParkingMapper;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;

/**
 * M6 â€“ F6.4 (quáº£n lÃ½ chá»— gá»­i), F6.1 gÃ¡n chá»— cho xe há»™ vÃ  F6.5 cho thuÃª chá»— thá»«a.
 *
 * Quy táº¯c phÃ­ gá»­i xe (monthlyFee) theo SDD:
 *   - MOTORBIKE: 70.000Ä‘/thÃ¡ng (máº·c Ä‘á»‹nh khi gÃ¡n xe há»™).
 *   - CAR      : 1.200.000Ä‘/thÃ¡ng (máº·c Ä‘á»‹nh khi gÃ¡n xe há»™).
 *   - Cho thuÃª ngoÃ i: phÃ­ nháº­p tay theo thoáº£ thuáº­n.
 */
@Service
public class ParkingService {

    private static final BigDecimal MOTORBIKE_FEE = new BigDecimal("70000");
    private static final BigDecimal CAR_FEE = new BigDecimal("1200000");

    private final ParkingSlotRepository slotRepository;
    private final ParkingRegistrationRepository registrationRepository;
    private final VehicleRepository vehicleRepository;
    private final ParkingMapper mapper;
    private final CurrentUserService currentUserService;

    public ParkingService(ParkingSlotRepository slotRepository,
                          ParkingRegistrationRepository registrationRepository,
                          VehicleRepository vehicleRepository,
                          ParkingMapper mapper,
                          CurrentUserService currentUserService) {
        this.slotRepository = slotRepository;
        this.registrationRepository = registrationRepository;
        this.vehicleRepository = vehicleRepository;
        this.mapper = mapper;
        this.currentUserService = currentUserService;
    }

    // F6.4 â€“ Danh sÃ¡ch chá»— gá»­i (cÃ³ phÃ¢n trang).
    @Transactional(readOnly = true)
    public PageResponse<ParkingSlotDTO> listSlots(Pageable pageable) {
        Page<ParkingSlotDTO> page = slotRepository.findAll(pageable).map(mapper::toSlotDto);
        return PageResponse.of(page);
    }

    // F6.4 â€“ TÃ¬nh tráº¡ng tá»•ng quan: tá»•ng / Ä‘Ã£ dÃ¹ng / cho thuÃª / cÃ²n trá»‘ng.
    @Transactional(readOnly = true)
    public ParkingSummaryDTO summary() {
        long total = slotRepository.count();
        long used = slotRepository.countByStatus(ParkingSlotStatus.USED);
        long rented = slotRepository.countByStatus(ParkingSlotStatus.RENTED);
        long empty = slotRepository.countByStatus(ParkingSlotStatus.EMPTY);
        return new ParkingSummaryDTO(total, used, rented, empty);
    }

    // F6.1 (gÃ¡n xe há»™) + F6.5 (cho thuÃª chá»— thá»«a).
    @Transactional
    public ParkingRegistrationDTO createRegistration(CreateParkingRegistrationRequest req) {
        ParkingSlot slot = slotRepository.findById(req.slotId())
                .orElseThrow(() -> new NotFoundException(
                        "PARKING_SLOT_NOT_FOUND", "KhÃ´ng tÃ¬m tháº¥y chá»— gá»­i id=" + req.slotId()));

        if (slot.getStatus() != ParkingSlotStatus.EMPTY) {
            throw new BadRequestException("PARKING_SLOT_NOT_EMPTY",
                    "Chá»— gá»­i " + slot.getCode() + " Ä‘ang Ä‘Æ°á»£c sá»­ dá»¥ng, khÃ´ng thá»ƒ gÃ¡n má»›i");
        }

        boolean assignVehicle = req.vehicleId() != null;
        boolean rentOut = req.renterName() != null && !req.renterName().isBlank();
        if (assignVehicle == rentOut) {
            throw new BadRequestException("PARKING_INVALID_MODE",
                    "Pháº£i chá»n Ä‘Ãºng má»™t trong hai: gÃ¡n xe cá»§a há»™ (vehicleId) " +
                            "hoáº·c cho ngÆ°á»i ngoÃ i thuÃª (renterName)");
        }

        ParkingRegistration reg = new ParkingRegistration();
        reg.setSlot(slot);
        reg.setStartDate(req.startDate() != null ? req.startDate() : LocalDate.now());
        reg.setEndDate(req.endDate());
        reg.setStatus(ParkingRegistrationStatus.ACTIVE);


        if (assignVehicle) {
            Vehicle vehicle = vehicleRepository.findById(req.vehicleId())
                    .orElseThrow(() -> new NotFoundException(
                            "VEHICLE_NOT_FOUND", "KhÃ´ng tÃ¬m tháº¥y xe id=" + req.vehicleId()));
            if (!Boolean.TRUE.equals(vehicle.getActive())) {
                throw new BadRequestException("VEHICLE_INACTIVE",
                        "Xe " + vehicle.getLicensePlate() + " Ä‘Ã£ huá»· Ä‘Äƒng kÃ½, khÃ´ng thá»ƒ gÃ¡n chá»—");
            }
            if (vehicle.getType() != slot.getType()) {
                throw new BadRequestException("PARKING_TYPE_MISMATCH",
                        "Loáº¡i xe (" + vehicle.getType() + ") khÃ´ng khá»›p loáº¡i chá»— gá»­i ("
                                + slot.getType() + ")");
            }
            if (registrationRepository.findByVehicleIdAndStatus(
                    vehicle.getId(), ParkingRegistrationStatus.ACTIVE).isPresent()) {
                throw new BadRequestException("VEHICLE_ALREADY_PARKED",
                        "Xe " + vehicle.getLicensePlate() + " Ä‘Ã£ cÃ³ chá»— gá»­i Ä‘ang hiá»‡u lá»±c");
            }

            reg.setVehicle(vehicle);
            reg.setMonthlyFee(req.monthlyFee() != null
                    ? req.monthlyFee() : defaultFee(vehicle.getType()));
            slot.setStatus(ParkingSlotStatus.USED);

        } else {
            if (req.monthlyFee() == null || req.monthlyFee().signum() <= 0) {
                throw new BadRequestException("PARKING_FEE_REQUIRED",
                        "Cho thuÃª chá»— thá»«a pháº£i nháº­p phÃ­ thuÃª (monthlyFee) > 0");
            }
            reg.setRenterName(req.renterName().trim());
            reg.setRenterPhone(req.renterPhone() != null ? req.renterPhone().trim() : null);
            reg.setMonthlyFee(req.monthlyFee());
            slot.setStatus(ParkingSlotStatus.RENTED);

        }

        registrationRepository.save(reg);
        slotRepository.save(slot);

        return mapper.toRegistrationDto(reg);
    }

    // F6.2 / F6.5 â€“ Káº¿t thÃºc má»™t lÆ°á»£t Ä‘Äƒng kÃ½/cho thuÃª, tráº£ chá»— vá» EMPTY.
    @Transactional
    public ParkingRegistrationDTO endRegistration(Long id) {
        ParkingRegistration reg = registrationRepository.findById(id)
                .orElseThrow(() -> new NotFoundException(
                        "PARKING_REGISTRATION_NOT_FOUND",
                        "KhÃ´ng tÃ¬m tháº¥y lÆ°á»£t Ä‘Äƒng kÃ½ id=" + id));

        if (reg.getStatus() == ParkingRegistrationStatus.ENDED) {
            throw new BadRequestException("PARKING_REGISTRATION_ENDED",
                    "LÆ°á»£t Ä‘Äƒng kÃ½ nÃ y Ä‘Ã£ káº¿t thÃºc");
        }

        reg.setStatus(ParkingRegistrationStatus.ENDED);
        if (reg.getEndDate() == null) reg.setEndDate(LocalDate.now());
        ParkingSlot slot = reg.getSlot();
        if (slot != null) {
            slot.setStatus(ParkingSlotStatus.EMPTY);
            slotRepository.save(slot);
        }
        registrationRepository.save(reg);

        return mapper.toRegistrationDto(reg);
    }

    // CÆ° dÃ¢n xem cÃ¡c lÆ°á»£t gá»­i xe ACTIVE cá»§a há»™ mÃ¬nh.
    @Transactional(readOnly = true)
    public PageResponse<ParkingRegistrationDTO> listMyHousehold(Pageable pageable) {
        Household h = currentUserService.getCurrentUser().getHousehold();
        if (h == null) {
            throw new BadRequestException("RESIDENT_NO_HOUSEHOLD",
                    "TÃ i khoáº£n chÆ°a Ä‘Æ°á»£c gÃ¡n vÃ o há»™ dÃ¢n nÃ o");
        }
        Page<ParkingRegistrationDTO> page = registrationRepository
                .findByVehicleHouseholdIdAndStatus(
                        h.getId(), ParkingRegistrationStatus.ACTIVE, pageable)
                .map(mapper::toRegistrationDto);
        return PageResponse.of(page);
    }

    private BigDecimal defaultFee(VehicleType type) {
        return type == VehicleType.CAR ? CAR_FEE : MOTORBIKE_FEE;
    }
}
