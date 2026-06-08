package org.example.backend.service;

import org.example.backend.aspect.AuditContext;
import org.example.backend.aspect.LogAdminAction;
import org.example.backend.dto.AccountCreatedDTO;
import org.example.backend.dto.HouseholdSummaryDTO;
import org.example.backend.dto.MoveInResultDTO;
import org.example.backend.dto.ResidentDetailDTO;
import org.example.backend.dto.request.AddMemberRequest;
import org.example.backend.dto.request.AssignHouseholdRequest;
import org.example.backend.dto.request.MoveInRequest;
import org.example.backend.dto.request.UpdateHouseholdRequest;
import org.example.backend.entity.Apartment;
import org.example.backend.entity.Household;
import org.example.backend.entity.Resident;
import org.example.backend.entity.enums.ApartmentStatus;
import org.example.backend.entity.enums.HouseholdStatus;
import org.example.backend.entity.enums.ResidencyStatus;
import org.example.backend.entity.enums.ResidentStatus;
import org.example.backend.exception.BadRequestException;
import org.example.backend.exception.NotFoundException;
import org.example.backend.repository.ApartmentRepository;
import org.example.backend.repository.HouseholdRepository;
import org.example.backend.repository.ResidentRepository;
import org.example.backend.service.mapper.ApartmentMapper;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class HouseholdLifecycleService {

    private final ApartmentRepository apartmentRepository;
    private final HouseholdRepository householdRepository;
    private final ResidentRepository residentRepository;
    private final ApartmentMapper mapper;
    private final UserService userService;
    private final ResidentService residentService;

    public HouseholdLifecycleService(ApartmentRepository apartmentRepository,
                                     HouseholdRepository householdRepository,
                                     ResidentRepository residentRepository,
                                     ApartmentMapper mapper,
                                     UserService userService,
                                     ResidentService residentService) {
        this.apartmentRepository = apartmentRepository;
        this.householdRepository = householdRepository;
        this.residentRepository = residentRepository;
        this.mapper = mapper;
        this.userService = userService;
        this.residentService = residentService;
    }


    //  Xem hộ dân/hộ khẩu đang ở trong căn hộ

    @Transactional(readOnly = true)
    public HouseholdSummaryDTO getActiveHousehold(Long apartmentId) {
        requireApartment(apartmentId);
        Household h = householdRepository
                .findByApartmentIdAndStatus(apartmentId, HouseholdStatus.ACTIVE)
                .orElseThrow(() -> new NotFoundException(
                        "NO_ACTIVE_HOUSEHOLD",
                        "Căn hộ id=" + apartmentId + " hiện không có hộ dân đang cư trú"));
        return mapper.toHouseholdSummary(h);
    }
    //  cán hộ dân vào căn hộ trống

    @LogAdminAction(entity = "Household", action = "CREATE", description = "Gán hộ dân vào căn hộ",
            detail = "'Hộ ' + #result.code() + ' vào căn hộ ' + #result.apartmentCode()")
    @Transactional
    public HouseholdSummaryDTO assignHousehold(Long apartmentId, AssignHouseholdRequest req) {
        Apartment ap = requireApartment(apartmentId);
        Household h = provisionHousehold(ap, req.code(), req.moveInDate(), req.headOfHousehold());
        return mapper.toHouseholdSummary(h);
    }

    /**
     * Action 1 – Bàn giao nhà (Move-in): tìm căn hộ theo MÃ, tạo hộ + chủ hộ,
     * đổi căn hộ sang OCCUPIED và (tùy chọn) cấp tài khoản đăng nhập cho chủ hộ.
     * Toàn bộ trong 1 giao dịch: lỗi ở bất kỳ bước nào -> rollback tất cả.
     */
    @LogAdminAction(entity = "Household", action = "CREATE", description = "Bàn giao nhà cho hộ mới",
            detail = "'Bàn giao căn hộ ' + #req.apartmentCode() + ' cho hộ ' + #req.householdCode()")
    @Transactional
    public MoveInResultDTO moveIn(MoveInRequest req) {
        Apartment ap = apartmentRepository.findByCode(req.apartmentCode().trim())
                .orElseThrow(() -> new NotFoundException(
                        "APARTMENT_NOT_FOUND",
                        "Không tìm thấy căn hộ với mã '" + req.apartmentCode() + "'"));

        Household h = provisionHousehold(ap, req.householdCode(), req.moveInDate(), req.headOfHousehold());

        AccountCreatedDTO account = null;
        if (req.createAccount()) {
            // Chủ hộ vừa được tạo trong provisionHousehold -> cấp tài khoản ngay trong cùng giao dịch.
            account = userService.createAccountForResident(h.getHeadOfHousehold());
        }

        return new MoveInResultDTO(mapper.toHouseholdSummary(h), account);
    }

    /**
     * Tạo Household + chủ hộ (Resident) cho một căn hộ trống và đổi trạng thái căn hộ.
     * Dùng chung cho cả "gán hộ" (assignHousehold) lẫn "bàn giao nhà" (moveIn).
     */
    private Household provisionHousehold(Apartment ap, String code, java.time.LocalDate moveInDate,
                                         AssignHouseholdRequest.HeadOfHouseholdInput in) {
        if (householdRepository.existsByApartmentIdAndStatus(ap.getId(), HouseholdStatus.ACTIVE)) {
            throw new BadRequestException(
                    "APARTMENT_ALREADY_OCCUPIED",
                    "Căn hộ đã có hộ dân đang cư trú. Hãy chuyển hộ hiện tại đi trước.");
        }
        if (householdRepository.existsByCode(code)) {
            throw new BadRequestException(
                    "HOUSEHOLD_CODE_DUPLICATED",
                    "Mã hộ khẩu '" + code + "' đã tồn tại");
        }

        //tạo Household trước, head_resident_id = NULL
        Household h = new Household();
        h.setCode(code);
        h.setApartment(ap);
        h.setMoveInDate(moveInDate);
        h.setStatus(HouseholdStatus.ACTIVE);
        try {
            h = householdRepository.saveAndFlush(h);
        } catch (DataIntegrityViolationException ex) {
            throw new BadRequestException(
                    "APARTMENT_ALREADY_OCCUPIED",
                    "Căn hộ vừa được gán hộ dân khác. Vui lòng làm mới và thử lại.");
        }

        //tạo Resident chủ hộ
        Resident head = new Resident();
        head.setFullName(in.fullName());
        head.setIdCard(in.idCard());
        head.setDateOfBirth(in.dateOfBirth());
        head.setGender(in.gender());
        head.setRelationToHead(in.relationToHead() == null ? "CHU_HO" : in.relationToHead());
        head.setResidencyStatus(
                in.residencyStatus() == null ? ResidencyStatus.PERMANENT : in.residencyStatus());
        head.setStatus(ResidentStatus.ACTIVE);
        head.setHousehold(h);
        head = residentRepository.save(head);

        //gán head_resident_id vào Household
        h.setHeadOfHousehold(head);
        h = householdRepository.save(h);
        // Cập nhật quan hệ in-memory để map đầy đủ trả về
        h.getResidents().add(head);

        // ---- Cập nhật trạng thái căn hộ ----
        ap.setStatus(ApartmentStatus.OCCUPIED);
        apartmentRepository.save(ap);

        return h;
    }

    /**
     * Action 2 – Thêm nhân khẩu vào hộ đã có: tái dùng ResidentService.createResident
     * (đã có sẵn kiểm tra hộ ACTIVE + trùng CCCD). householdId lấy từ path.
     */
    @Transactional
    public ResidentDetailDTO addMember(Long householdId, AddMemberRequest req) {
        return residentService.createResident(req.toCreateResidentRequest(householdId));
    }

    /**
     * Action 4 – Chuyển đi / Giải tán hộ theo householdId:
     * Household -> MOVED_OUT, mọi nhân khẩu ACTIVE -> MOVED_OUT, căn hộ -> AVAILABLE,
     * và KHÓA toàn bộ tài khoản cư dân gắn với hộ. Tất cả trong 1 giao dịch.
     */
    @LogAdminAction(entity = "Household", action = "UPDATE", description = "Chuyển cả hộ ra khỏi căn hộ")
    @Transactional
    public HouseholdSummaryDTO moveOutByHouseholdId(Long householdId) {
        Household h = householdRepository.findById(householdId)
                .orElseThrow(() -> new NotFoundException(
                        "HOUSEHOLD_NOT_FOUND",
                        "Không tìm thấy hộ khẩu id = " + householdId));

        if (h.getStatus() != HouseholdStatus.ACTIVE) {
            throw new BadRequestException(
                    "HOUSEHOLD_NOT_ACTIVE",
                    "Hộ này đã chuyển đi trước đó.");
        }

        Apartment ap = h.getApartment();
        // doMoveOut đã bao gồm khóa tài khoản cư dân gắn với hộ.
        return doMoveOut(ap, h);
    }


    // Cập nhật hoặc Chuyển hộ ra khỏi căn hộ

    @LogAdminAction(entity = "Household", action = "UPDATE", description = "Cập nhật/chuyển hộ dân khỏi căn hộ")
    @Transactional
    public HouseholdSummaryDTO updateHousehold(Long apartmentId, UpdateHouseholdRequest req) {

        Apartment ap = requireApartment(apartmentId);

        Household h = householdRepository
                .findByApartmentIdAndStatus(apartmentId, HouseholdStatus.ACTIVE)
                .orElseThrow(() -> new BadRequestException(
                        "NO_ACTIVE_HOUSEHOLD",
                        "Căn hộ chưa có hộ dân ACTIVE để cập nhật/chuyển"));

        return switch (req.action()) {
            case UPDATE -> doUpdate(h, req);
            case MOVE_OUT -> doMoveOut(ap, h);
        };
    }

    // cập nhập
    private HouseholdSummaryDTO doUpdate(Household h, UpdateHouseholdRequest req) {
        if (req.code() != null && !req.code().equals(h.getCode())) {
            if (householdRepository.existsByCode(req.code())) {
                throw new BadRequestException(
                        "HOUSEHOLD_CODE_DUPLICATED",
                        "Mã hộ '" + req.code() + "' đã tồn tại");
            }
            h.setCode(req.code());
        }
        if (req.moveInDate() != null) {
            h.setMoveInDate(req.moveInDate());
        }
        if (req.headResidentId() != null) {
            Resident newHead = residentRepository.findById(req.headResidentId())
                    .orElseThrow(() -> new NotFoundException(
                            "RESIDENT_NOT_FOUND",
                            "Không tìm thấy nhân khẩu id=" + req.headResidentId()));
            // Chủ hộ mới phải thuộc đúng hộ và còn ACTIVE
            if (newHead.getHousehold() == null
                    || !newHead.getHousehold().getId().equals(h.getId())) {
                throw new BadRequestException(
                        "HEAD_NOT_IN_HOUSEHOLD",
                        "Nhân khẩu không thuộc hộ này");
            }
            if (newHead.getStatus() != ResidentStatus.ACTIVE) {
                throw new BadRequestException(
                        "HEAD_NOT_ACTIVE",
                        "Nhân khẩu được chọn làm chủ hộ đang ở trạng thái " + newHead.getStatus());
            }
            h.setHeadOfHousehold(newHead);
        }
        if (req.memberRelations() != null) {
            for (UpdateHouseholdRequest.MemberRelationUpdate relationUpdate : req.memberRelations()) {
                if (relationUpdate == null || relationUpdate.residentId() == null) {
                    continue;
                }
                Resident member = residentRepository.findById(relationUpdate.residentId())
                        .orElseThrow(() -> new NotFoundException(
                                "RESIDENT_NOT_FOUND",
                                "Không tìm thấy nhân khẩu id=" + relationUpdate.residentId()));
                if (member.getHousehold() == null
                        || !member.getHousehold().getId().equals(h.getId())) {
                    throw new BadRequestException(
                            "MEMBER_NOT_IN_HOUSEHOLD",
                            "Nhân khẩu không thuộc hộ này");
                }
                if (member.getStatus() != ResidentStatus.ACTIVE) {
                    throw new BadRequestException(
                            "MEMBER_NOT_ACTIVE",
                            "Nhân khẩu đang ở trạng thái " + member.getStatus());
                }
                member.setRelationToHead(
                        relationUpdate.relationToHead() == null ? null : relationUpdate.relationToHead().trim());
                residentRepository.save(member);
            }
        }
        h = householdRepository.save(h);

        AuditContext.detail("Cập nhật thông tin hộ " + h.getCode()
                + " (căn hộ " + (h.getApartment() != null ? h.getApartment().getCode() : "?") + ")");
        return mapper.toHouseholdSummary(h);
    }

    // chuển khỏi căn h
    private HouseholdSummaryDTO doMoveOut(Apartment ap, Household h) {
        h.setStatus(HouseholdStatus.MOVED_OUT);
        householdRepository.save(h);
        AuditContext.detail("Chuyển hộ " + h.getCode() + " ra khỏi căn hộ " + ap.getCode());

        // Đồng thời đánh dấu toàn bộ nhân khẩu ACTIVE trong hộ là MOVED_OUT
        residentRepository.markAllResidentsMovedOut(h.getId(),
                ResidentStatus.MOVED_OUT);

        // Khóa toàn bộ tài khoản cư dân gắn với hộ (Action 4 - phần tài khoản).
        // Đặt ở đây để cả 2 luồng move-out (qua căn hộ và qua householdId) đều khóa nhất quán.
        userService.lockUsersByHousehold(h.getId());

        ap.setStatus(ApartmentStatus.AVAILABLE);
        apartmentRepository.save(ap);

        // Trả về snapshot trạng thái sau khi move out để FE refresh
        return mapper.toHouseholdSummary(h);
    }


    //  Helpers
    private Apartment requireApartment(Long id) {
        return apartmentRepository.findById(id)
                .orElseThrow(() -> new NotFoundException(
                        "APARTMENT_NOT_FOUND",
                        "Không tìm thấy căn hộ id=" + id));
    }
}


