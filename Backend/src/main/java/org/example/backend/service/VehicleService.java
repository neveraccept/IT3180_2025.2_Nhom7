package org.example.backend.service;

import org.example.backend.dto.response.PageResponse;
import org.example.backend.dto.VehicleDTO;
import org.example.backend.dto.request.RegisterVehicleRequest;
import org.example.backend.dto.request.UpdateVehicleRequest;
import org.example.backend.entity.Household;
import org.example.backend.entity.ParkingRegistration;
import org.example.backend.entity.Vehicle;
import org.example.backend.entity.enums.ParkingRegistrationStatus;
import org.example.backend.entity.enums.ParkingSlotStatus;
import org.example.backend.exception.BadRequestException;
import org.example.backend.exception.NotFoundException;
import org.example.backend.repository.HouseholdRepository;
import org.example.backend.repository.ParkingRegistrationRepository;
import org.example.backend.repository.VehicleRepository;
import org.example.backend.security.CurrentUserService;
import org.example.backend.service.mapper.VehicleMapper;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;

/**
 * M6 â€“ F6.1, F6.2, F6.3: quáº£n lÃ½ phÆ°Æ¡ng tiá»‡n (xe) cá»§a há»™ dÃ¢n.
 * Viá»‡c gÃ¡n/giáº£i phÃ³ng chá»— gá»­i xe (ParkingRegistration) do {@link ParkingService} phá»¥ trÃ¡ch;
 * khi huá»· xe, service nÃ y cÅ©ng Ä‘Ã³ng lÆ°á»£t Ä‘Äƒng kÃ½ ACTIVE vÃ  tráº£ chá»— vá» EMPTY.
 */
@Service
public class VehicleService {

    private final VehicleRepository vehicleRepository;
    private final HouseholdRepository householdRepository;
    private final ParkingRegistrationRepository registrationRepository;
    private final VehicleMapper mapper;
    private final CurrentUserService currentUserService;

    public VehicleService(VehicleRepository vehicleRepository,
                          HouseholdRepository householdRepository,
                          ParkingRegistrationRepository registrationRepository,
                          VehicleMapper mapper,
                          CurrentUserService currentUserService) {
        this.vehicleRepository = vehicleRepository;
        this.householdRepository = householdRepository;
        this.registrationRepository = registrationRepository;
        this.mapper = mapper;
        this.currentUserService = currentUserService;
    }

    // F6.1 â€“ ÄÄƒng kÃ½ xe cho há»™.
    @Transactional
    public VehicleDTO register(RegisterVehicleRequest req) {
        String plate = req.licensePlate().trim();
        if (vehicleRepository.existsByLicensePlate(plate)) {
            throw new BadRequestException("VEHICLE_PLATE_DUPLICATE",
                    "Biá»ƒn sá»‘ Ä‘Ã£ Ä‘Æ°á»£c Ä‘Äƒng kÃ½: " + plate);
        }
        Household household = householdRepository.findById(req.householdId())
                .orElseThrow(() -> new NotFoundException(
                        "HOUSEHOLD_NOT_FOUND", "KhÃ´ng tÃ¬m tháº¥y há»™ id=" + req.householdId()));

        Vehicle v = new Vehicle();
        v.setHousehold(household);
        v.setLicensePlate(plate);
        v.setType(req.type());
        v.setRegisteredDate(LocalDate.now());
        v.setActive(true);
        vehicleRepository.save(v);

        return mapper.toDto(v);
    }

    // F6.2 â€“ Cáº­p nháº­t thÃ´ng tin xe.
    @Transactional
    public VehicleDTO update(Long id, UpdateVehicleRequest req) {
        Vehicle v = requireVehicle(id);

        if (req.licensePlate() != null) {
            String plate = req.licensePlate().trim();
            if (!plate.equalsIgnoreCase(v.getLicensePlate())
                    && vehicleRepository.existsByLicensePlate(plate)) {
                throw new BadRequestException("VEHICLE_PLATE_DUPLICATE",
                        "Biá»ƒn sá»‘ Ä‘Ã£ Ä‘Æ°á»£c Ä‘Äƒng kÃ½: " + plate);
            }
            v.setLicensePlate(plate);
        }
        if (req.type() != null) v.setType(req.type());
        if (req.active() != null) v.setActive(req.active());

        vehicleRepository.save(v);
        return mapper.toDto(v);
    }

    // F6.2 â€“ Huá»· Ä‘Äƒng kÃ½ xe (soft delete) + tráº£ chá»— gá»­i vá» EMPTY.
    @Transactional
    public void cancel(Long id) {
        Vehicle v = requireVehicle(id);
        v.setActive(false);
        vehicleRepository.save(v);

        registrationRepository
                .findByVehicleIdAndStatus(id, ParkingRegistrationStatus.ACTIVE)
                .ifPresent(reg -> {
                    reg.setStatus(ParkingRegistrationStatus.ENDED);
                    if (reg.getEndDate() == null) reg.setEndDate(LocalDate.now());
                    if (reg.getSlot() != null) reg.getSlot().setStatus(ParkingSlotStatus.EMPTY);
                    registrationRepository.save(reg);
                });

    }

    // F6.3 â€“ Admin tra cá»©u xe theo há»™.
    @Transactional(readOnly = true)
    public PageResponse<VehicleDTO> listByHousehold(Long householdId, Pageable pageable) {
        if (!householdRepository.existsById(householdId)) {
            throw new NotFoundException("HOUSEHOLD_NOT_FOUND",
                    "KhÃ´ng tÃ¬m tháº¥y há»™ id=" + householdId);
        }
        Page<VehicleDTO> page = vehicleRepository
                .findByHouseholdId(householdId, pageable)
                .map(mapper::toDto);
        return PageResponse.of(page);
    }

    // F6.3 â€“ CÆ° dÃ¢n xem xe cá»§a há»™ mÃ¬nh.
    @Transactional(readOnly = true)
    public PageResponse<VehicleDTO> listMyHousehold(Pageable pageable) {
        Long householdId = currentHouseholdId();
        Page<VehicleDTO> page = vehicleRepository
                .findByHouseholdId(householdId, pageable)
                .map(mapper::toDto);
        return PageResponse.of(page);
    }

    // Helpers

    private Vehicle requireVehicle(Long id) {
        return vehicleRepository.findById(id)
                .orElseThrow(() -> new NotFoundException(
                        "VEHICLE_NOT_FOUND", "KhÃ´ng tÃ¬m tháº¥y xe id=" + id));
    }

    private Long currentHouseholdId() {
        Household h = currentUserService.getCurrentUser().getHousehold();
        if (h == null) {
            throw new BadRequestException("RESIDENT_NO_HOUSEHOLD",
                    "TÃ i khoáº£n chÆ°a Ä‘Æ°á»£c gÃ¡n vÃ o há»™ dÃ¢n nÃ o");
        }
        return h.getId();
    }
}
