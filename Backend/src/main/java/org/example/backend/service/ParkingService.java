package org.example.backend.service;

import org.example.backend.aspect.LogAdminAction;
import org.example.backend.dto.response.PageResponse;
import org.example.backend.dto.ParkingRegistrationDTO;
import org.example.backend.dto.ParkingSlotDTO;
import org.example.backend.dto.ParkingSummaryDTO;
import org.example.backend.dto.request.CreateParkingRegistrationRequest;
import org.example.backend.entity.Household;
import org.example.backend.entity.ParkingRegistration;
import org.example.backend.entity.ParkingSlot;
import org.example.backend.entity.SystemConfig;
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
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * M6 - F6.4 (quản lý chỗ gửi), F6.1 gán chỗ cho xe hộ và F6.5 cho thuê chỗ thừa.
 *
 * Quy tắc phí gửi xe (monthlyFee): gán xe hộ lấy đơn giá mặc định từ SystemConfig,
 * cho thuê ngoài dùng phí nhập tay theo thoả thuận.
 */
@Service
public class ParkingService {

    private final ParkingSlotRepository slotRepository;
    private final ParkingRegistrationRepository registrationRepository;
    private final VehicleRepository vehicleRepository;
    private final ParkingMapper mapper;
    private final CurrentUserService currentUserService;
    private final SystemConfigService systemConfigService;

    public ParkingService(ParkingSlotRepository slotRepository,
                          ParkingRegistrationRepository registrationRepository,
                          VehicleRepository vehicleRepository,
                          ParkingMapper mapper,
                          CurrentUserService currentUserService,
                          SystemConfigService systemConfigService) {
        this.slotRepository = slotRepository;
        this.registrationRepository = registrationRepository;
        this.vehicleRepository = vehicleRepository;
        this.mapper = mapper;
        this.currentUserService = currentUserService;
        this.systemConfigService = systemConfigService;
    }

    // F6.4 - Danh sách chỗ gửi (có phân trang), kèm biển số xe và mã căn hộ.
    @Transactional(readOnly = true)
    public PageResponse<ParkingSlotDTO> listSlots(Pageable pageable) {
        Page<ParkingSlot> slotsPage = slotRepository.findAll(pageable);

        // Thu thập slotId để batch-load lượt đăng ký ACTIVE trong 1 query (tránh N+1).
        List<Long> slotIds = slotsPage.getContent().stream()
                .map(ParkingSlot::getId)
                .collect(Collectors.toList());

        Map<Long, ParkingRegistration> activeBySlotId = slotIds.isEmpty()
                ? Collections.emptyMap()
                : registrationRepository
                        .findBySlotIdsAndStatusWithDetails(slotIds, ParkingRegistrationStatus.ACTIVE)
                        .stream()
                        .collect(Collectors.toMap(
                                r -> r.getSlot().getId(),
                                r -> r,
                                (a, b) -> a   // giữ bản ghi đầu nếu trùng (không nên xảy ra)
                        ));

        Page<ParkingSlotDTO> page = slotsPage.map(
                s -> mapper.toSlotDto(s, activeBySlotId.get(s.getId())));
        return PageResponse.of(page);
    }

    // F6.4 - Tình trạng tổng quan: tổng / đã dùng / cho thuê / còn trống.
    @Transactional(readOnly = true)
    public ParkingSummaryDTO summary() {
        long total = slotRepository.count();
        long used = slotRepository.countByStatus(ParkingSlotStatus.USED);
        long rented = slotRepository.countByStatus(ParkingSlotStatus.RENTED);
        long empty = slotRepository.countByStatus(ParkingSlotStatus.EMPTY);
        return new ParkingSummaryDTO(total, used, rented, empty);
    }

    // F6.1 (gán xe hộ) + F6.5 (cho thuê chỗ thừa).
    @LogAdminAction(entity = "ParkingRegistration", action = "CREATE", description = "Gán/cho thuê chỗ gửi xe",
            detail = "'Chỗ ' + #result.slotCode()")
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


        if (assignVehicle) {
            Vehicle vehicle = vehicleRepository.findById(req.vehicleId())
                        .orElseThrow(() -> new NotFoundException(
                                    "VEHICLE_NOT_FOUND", "Không tìm thấy xe id=" + req.vehicleId()));
            if (!Boolean.TRUE.equals(vehicle.getActive())) {
                throw new BadRequestException("VEHICLE_INACTIVE",
                        "Xe " + vehicle.getLicensePlate() + " đã hủy đăng ký, không thể gán chỗ");
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

        } else {
            if (req.monthlyFee() == null || req.monthlyFee().signum() <= 0) {
                throw new BadRequestException("PARKING_FEE_REQUIRED",
                        "Cho thuê chỗ thừa phải nhập phí thuê (monthlyFee) > 0");
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

    // F6.2 / F6.5 - Kết thúc một lượt đăng ký/cho thuê, trả chỗ về EMPTY.
    @LogAdminAction(entity = "ParkingRegistration", action = "UPDATE", description = "Kết thúc lượt gửi xe, trả chỗ về trống",
            detail = "'Chỗ ' + #result.slotCode()")
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
        // Gỡ xe khỏi chỗ gửi
        if (reg.getVehicle() != null) {
            reg.getVehicle().setActive(false);
            vehicleRepository.save(reg.getVehicle());
        }
        registrationRepository.save(reg);

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
        return systemConfigService.getValue(type == VehicleType.CAR
                ? SystemConfig.CAR_PARKING_PRICE
                : SystemConfig.MOTORBIKE_PARKING_PRICE);
    }
}
