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
 * M6 – F6.4 (quản lý chỗ gửi), F6.1 gán chỗ cho xe hộ và F6.5 cho thuê chỗ thừa.
 *
 * Quy tắc phí gửi xe (monthlyFee) theo SDD:
 *   - MOTORBIKE: 70.000đ/tháng (mặc định khi gán xe hộ).
 *   - CAR      : 1.200.000đ/tháng (mặc định khi gán xe hộ).
 *   - Cho thuê ngoài: phí nhập tay theo thoả thuận.
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
    private final AuditLogService auditLogService;

    public ParkingService(ParkingSlotRepository slotRepository,
                          ParkingRegistrationRepository registrationRepository,
                          VehicleRepository vehicleRepository,
                          ParkingMapper mapper,
                          CurrentUserService currentUserService,
                          AuditLogService auditLogService) {
        this.slotRepository = slotRepository;
        this.registrationRepository = registrationRepository;
        this.vehicleRepository = vehicleRepository;
        this.mapper = mapper;
        this.currentUserService = currentUserService;
        this.auditLogService = auditLogService;
    }

    // F6.4 – Danh sách chỗ gửi (có phân trang).
    @Transactional(readOnly = true)
    public PageResponse<ParkingSlotDTO> listSlots(Pageable pageable) {
        Page<ParkingSlotDTO> page = slotRepository.findAll(pageable).map(mapper::toSlotDto);
        return PageResponse.of(page);
    }

    // F6.4 – Tình trạng tổng quan: tổng / đã dùng / cho thuê / còn trống.
    @Transactional(readOnly = true)
    public ParkingSummaryDTO summary() {
        long total = slotRepository.count();
        long used = slotRepository.countByStatus(ParkingSlotStatus.USED);
        long rented = slotRepository.countByStatus(ParkingSlotStatus.RENTED);
        long empty = slotRepository.countByStatus(ParkingSlotStatus.EMPTY);
        return new ParkingSummaryDTO(total, used, rented, empty);
    }

    // F6.1 (gán xe hộ) + F6.5 (cho thuê chỗ thừa).
    @Transactional
    public ParkingRegistrationDTO createRegistration(CreateParkingRegistrationRequest req) {
        ParkingSlot slot = slotRepository.findById(req.slotId())
                .orElseThrow(() -> new NotFoundException(
                        "PARKING_SLOT_NOT_FOUND", "Không tìm thấy chỗ gửi id=" + req.slotId()));

        if (slot.getStatus() != ParkingSlotStatus.EMPTY) {
            throw new BadRequestException("PARKING_SLOT_NOT_EMPTY",
                    "Chỗ gửi " + slot.getCode() + " đang được sử dụng, không thể gán mới");
        }

        boolean assignVehicle = req.vehicleId() != null;
        boolean rentOut = req.renterName() != null && !req.renterName().isBlank();
        if (assignVehicle == rentOut) {
            throw new BadRequestException("PARKING_INVALID_MODE",
                    "Phải chọn đúng một trong hai: gán xe của hộ (vehicleId) " +
                            "hoặc cho người ngoài thuê (renterName)");
        }

        ParkingRegistration reg = new ParkingRegistration();
        reg.setSlot(slot);
        reg.setStartDate(req.startDate() != null ? req.startDate() : LocalDate.now());
        reg.setEndDate(req.endDate());
        reg.setStatus(ParkingRegistrationStatus.ACTIVE);

        String action;
        String description;

        if (assignVehicle) {
            Vehicle vehicle = vehicleRepository.findById(req.vehicleId())
                    .orElseThrow(() -> new NotFoundException(
                            "VEHICLE_NOT_FOUND", "Không tìm thấy xe id=" + req.vehicleId()));
            if (!Boolean.TRUE.equals(vehicle.getActive())) {
                throw new BadRequestException("VEHICLE_INACTIVE",
                        "Xe " + vehicle.getLicensePlate() + " đã huỷ đăng ký, không thể gán chỗ");
            }
            if (vehicle.getType() != slot.getType()) {
                throw new BadRequestException("PARKING_TYPE_MISMATCH",
                        "Loại xe (" + vehicle.getType() + ") không khớp loại chỗ gửi ("
                                + slot.getType() + ")");
            }
            if (registrationRepository.findByVehicleIdAndStatus(
                    vehicle.getId(), ParkingRegistrationStatus.ACTIVE).isPresent()) {
                throw new BadRequestException("VEHICLE_ALREADY_PARKED",
                        "Xe " + vehicle.getLicensePlate() + " đã có chỗ gửi đang hiệu lực");
            }

            reg.setVehicle(vehicle);
            reg.setMonthlyFee(req.monthlyFee() != null
                    ? req.monthlyFee() : defaultFee(vehicle.getType()));
            slot.setStatus(ParkingSlotStatus.USED);

            action = "PARKING_ASSIGN";
            description = "Gán chỗ " + slot.getCode() + " cho xe " + vehicle.getLicensePlate();
        } else {
            if (req.monthlyFee() == null || req.monthlyFee().signum() <= 0) {
                throw new BadRequestException("PARKING_FEE_REQUIRED",
                        "Cho thuê chỗ thừa phải nhập phí thuê (monthlyFee) > 0");
            }

            if (req.renterLicensePlate() == null || req.renterLicensePlate().isBlank()) {
                throw new BadRequestException("PARKING_LICENSE_PLATE_REQUIRED",
                        "Cho thuê ngoài bắt buộc phải nhập biển số xe (renterLicensePlate)");
            }

            reg.setRenterName(req.renterName().trim());
            reg.setRenterPhone(req.renterPhone() != null ? req.renterPhone().trim() : null);
            reg.setRenterLicensePlate(req.renterLicensePlate().trim());
            reg.setMonthlyFee(req.monthlyFee());
            slot.setStatus(ParkingSlotStatus.RENTED);

            action = "PARKING_RENT";
            description = "Cho thuê chỗ " + slot.getCode() + " cho " + reg.getRenterName();
        }

        registrationRepository.save(reg);
        slotRepository.save(slot);

        auditLogService.log(action, "PARKING_REGISTRATION", reg.getId(), description);
        return mapper.toRegistrationDto(reg);
    }

    // F6.2 / F6.5 – Kết thúc một lượt đăng ký/cho thuê, trả chỗ về EMPTY.
    @Transactional
    public ParkingRegistrationDTO endRegistration(Long id) {
        ParkingRegistration reg = registrationRepository.findById(id)
                .orElseThrow(() -> new NotFoundException(
                        "PARKING_REGISTRATION_NOT_FOUND",
                        "Không tìm thấy lượt đăng ký id=" + id));

        if (reg.getStatus() == ParkingRegistrationStatus.ENDED) {
            throw new BadRequestException("PARKING_REGISTRATION_ENDED",
                    "Lượt đăng ký này đã kết thúc");
        }

        reg.setStatus(ParkingRegistrationStatus.ENDED);
        if (reg.getEndDate() == null) reg.setEndDate(LocalDate.now());
        ParkingSlot slot = reg.getSlot();
        if (slot != null) {
            slot.setStatus(ParkingSlotStatus.EMPTY);
            slotRepository.save(slot);
        }
        registrationRepository.save(reg);

        auditLogService.log("PARKING_END", "PARKING_REGISTRATION", reg.getId(),
                "Kết thúc lượt gửi xe tại chỗ " + (slot != null ? slot.getCode() : "?"));
        return mapper.toRegistrationDto(reg);
    }

    // Cư dân xem các lượt gửi xe ACTIVE của hộ mình.
    @Transactional(readOnly = true)
    public PageResponse<ParkingRegistrationDTO> listMyHousehold(Pageable pageable) {
        Household h = currentUserService.getCurrentUser().getHousehold();
        if (h == null) {
            throw new BadRequestException("RESIDENT_NO_HOUSEHOLD",
                    "Tài khoản chưa được gán vào hộ dân nào");
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
