package org.example.backend.service;

import org.example.backend.dto.HouseholdSummaryDTO;
import org.example.backend.dto.request.AssignHouseholdRequest;
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

    public HouseholdLifecycleService(ApartmentRepository apartmentRepository,
                                     HouseholdRepository householdRepository,
                                     ResidentRepository residentRepository,
                                     ApartmentMapper mapper) {
        this.apartmentRepository = apartmentRepository;
        this.householdRepository = householdRepository;
        this.residentRepository = residentRepository;
        this.mapper = mapper;
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

    @Transactional
    public HouseholdSummaryDTO assignHousehold(Long apartmentId, AssignHouseholdRequest req) {

        Apartment ap = requireApartment(apartmentId);

        if (householdRepository.existsByApartmentIdAndStatus(apartmentId, HouseholdStatus.ACTIVE)) {
            throw new BadRequestException(
                    "APARTMENT_ALREADY_OCCUPIED",
                    "Căn hộ đã có hộ dân đang cư trú. Hãy chuyển hộ hiện tại đi trước.");
        }
        if (householdRepository.existsByCode(req.code())) {
            throw new BadRequestException(
                    "HOUSEHOLD_CODE_DUPLICATED",
                    "Mã hộ khẩu '" + req.code() + "' đã tồn tại");
        }

        //tạo Household trước, head_resident_id = NULL
        Household h = new Household();
        h.setCode(req.code());
        h.setApartment(ap);
        h.setMoveInDate(req.moveInDate());
        h.setStatus(HouseholdStatus.ACTIVE);
        try {
            h = householdRepository.saveAndFlush(h);
        } catch (DataIntegrityViolationException ex) {
            throw new BadRequestException(
                    "APARTMENT_ALREADY_OCCUPIED",
                    "Căn hộ vừa được gán hộ dân khác. Vui lòng làm mới và thử lại.");
        }

        //tạo Resident chủ hộ
        AssignHouseholdRequest.HeadOfHouseholdInput in = req.headOfHousehold();
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

        return mapper.toHouseholdSummary(h);
    }


    // Cập nhật hoặc Chuyển hộ ra khỏi căn hộ

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

        return mapper.toHouseholdSummary(h);
    }

    // chuển khỏi căn h
    private HouseholdSummaryDTO doMoveOut(Apartment ap, Household h) {
        h.setStatus(HouseholdStatus.MOVED_OUT);
        householdRepository.save(h);

        // Đồng thời đánh dấu toàn bộ nhân khẩu ACTIVE trong hộ là MOVED_OUT
        residentRepository.markAllResidentsMovedOut(h.getId(),
                ResidentStatus.MOVED_OUT);

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


