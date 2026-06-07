package org.example.backend.service;

import lombok.RequiredArgsConstructor;
import org.example.backend.aspect.LogAdminAction;
import org.example.backend.dto.response.PageResponse;
import org.example.backend.dto.ResidentSummaryDTO;
import org.example.backend.dto.ResidentDetailDTO;
import org.example.backend.dto.request.CreateResidentRequest;
import org.example.backend.dto.request.ResidentSearchCriteria;
import org.example.backend.dto.request.UpdateResidentRequest;
import org.example.backend.entity.Household;
import org.example.backend.entity.Resident;
import org.example.backend.entity.enums.HouseholdStatus;
import org.example.backend.entity.enums.ResidencyStatus;
import org.example.backend.entity.enums.ResidentStatus;
import org.example.backend.exception.BadRequestException;
import org.example.backend.exception.NotFoundException;
import org.example.backend.service.mapper.ApartmentMapper;
import org.example.backend.service.mapper.ResidentMapper;
import org.example.backend.repository.HouseholdRepository;
import org.example.backend.repository.ResidentRepository;
import org.example.backend.repository.ResidentSpecifications;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional
public class ResidentService {

    private final ResidentRepository residentRepository;
    private final HouseholdRepository householdRepository;
    private final ResidentMapper residentMapper;
    private final ApartmentMapper apartmentMapper;

    //Thêm nhân khẩu vào hộ khẩu
    @LogAdminAction(entity = "Resident", action = "CREATE", description = "Thêm nhân khẩu vào hộ khẩu",
            detail = "'Nhân khẩu: ' + #result.fullName() + ' - hộ ' + #result.householdCode()")
    public ResidentDetailDTO createResident(CreateResidentRequest req) {

        Household household = householdRepository.findById(req.householdId())
                .orElseThrow(() -> new NotFoundException(
                        "HOUSEHOLD_NOT_FOUND",
                        "Không tìm thấy hộ khẩu id = " + req.householdId()));

        if (!HouseholdStatus.ACTIVE.equals(household.getStatus())) {
            throw new BadRequestException(
                    "HOUSEHOLD_NOT_ACTIVE",
                    "Không thể thêm nhân khẩu vào hộ khẩu đã chuyển đi");
        }

        if (residentRepository.existsByIdCard(req.idCard())) {
            throw new BadRequestException(
                    "ID_CARD_DUPLICATED",
                    "CCCD/CMND " + req.idCard() + " đã tồn tại trong hệ thống");
        }

        Resident r = new Resident();
        r.setFullName(req.fullName().trim());
        r.setIdCard(req.idCard().trim());
        r.setDateOfBirth(req.dateOfBirth());
        r.setGender(req.gender()); // Enum
        r.setRelationToHead(req.relationToHead().trim());

        // Mặc định PERMANENT nếu người dùng không truyền vào
        r.setResidencyStatus(req.residencyStatus() == null ? ResidencyStatus.PERMANENT : req.residencyStatus());
        r.setStatus(ResidentStatus.ACTIVE);
        r.setHousehold(household);

        Resident saved = residentRepository.save(r);

        return residentMapper.toDetail(saved);
    }

    // Sửa nhân khẩu
    @LogAdminAction(entity = "Resident", action = "UPDATE", description = "Cập nhật thông tin nhân khẩu",
            detail = "'Nhân khẩu: ' + #result.fullName()")
    public ResidentDetailDTO updateResident(Long id, UpdateResidentRequest req) {

        Resident r = findActiveResidentOrThrow(id);

        if (!r.getIdCard().equals(req.idCard()) && residentRepository.existsByIdCardAndIdNot(req.idCard(), id)) {
            throw new BadRequestException(
                    "ID_CARD_DUPLICATED",
                    "CCCD/CMND " + req.idCard() + " đã tồn tại ở nhân khẩu khác");
        }

        r.setFullName(req.fullName().trim());
        r.setIdCard(req.idCard().trim());
        r.setDateOfBirth(req.dateOfBirth());
        r.setGender(req.gender());
        r.setRelationToHead(req.relationToHead().trim());

        Resident saved = residentRepository.save(r);

        return residentMapper.toDetail(saved);
    }

    //  Chuyển nhân khẩu khỏi hộ
    @LogAdminAction(entity = "Resident", action = "UPDATE", description = "Chuyển nhân khẩu ra khỏi hộ (MOVED_OUT)",
            detail = "'Nhân khẩu: ' + #result.fullName() + ' - hộ ' + #result.householdCode()")
    public ResidentDetailDTO moveOutResident(Long id) {

        Resident r = findActiveResidentOrThrow(id);
        Household h = r.getHousehold();
        if (h != null
                && h.getHeadOfHousehold() != null
                && h.getHeadOfHousehold().getId().equals(r.getId())) {
            throw new BadRequestException(
                    "HEAD_OF_HOUSEHOLD_CANNOT_MOVE_OUT",
                    "Không thể chuyển chủ hộ khỏi hộ. Vui lòng thao tác ở phần căn hộ để đổi chủ hộ hoặc chuyển cả căn hộ đi.");
        }

        r.setStatus(ResidentStatus.MOVED_OUT);
        Resident saved = residentRepository.save(r);

        return residentMapper.toDetail(saved);
    }

    //  Đăng ký tạm trú
    @LogAdminAction(entity = "Resident", action = "UPDATE", description = "Đăng ký tạm trú cho nhân khẩu",
            detail = "'Nhân khẩu: ' + #result.fullName()")
    public ResidentDetailDTO registerTemporaryResidence(Long id) {
        return changeResidencyStatus(id, ResidencyStatus.TEMPORARY);
    }

    //  Chuyển tạm trú về thường trú
    @LogAdminAction(entity = "Resident", action = "UPDATE", description = "Chuyển nhân khẩu về thường trú",
            detail = "'Nhân khẩu: ' + #result.fullName()")
    public ResidentDetailDTO registerPermanentResidence(Long id) {
        return changeResidencyStatus(id, ResidencyStatus.PERMANENT);
    }

    private ResidentDetailDTO changeResidencyStatus(Long id, ResidencyStatus newResidency) {

        Resident r = findActiveResidentOrThrow(id);

        if (newResidency == r.getResidencyStatus()) {
            throw new BadRequestException(
                    "RESIDENCY_STATUS_UNCHANGED",
                    "Nhân khẩu đang ở trạng thái " + newResidency + " rồi");
        }

        r.setResidencyStatus(newResidency);
        Resident saved = residentRepository.save(r);

        return residentMapper.toDetail(saved);
    }

    // Tra cứu nhân khẩu
    @Transactional(readOnly = true)
    public PageResponse<ResidentSummaryDTO> searchResidents(
            ResidentSearchCriteria criteria, Pageable pageable) {

        Page<Resident> page = residentRepository.findAll(
                ResidentSpecifications.build(criteria), pageable);

        Page<ResidentSummaryDTO> dtoPage = page.map(apartmentMapper::toResidentSummary);
        return PageResponse.of(dtoPage);
    }

    // Chi tiết 1 nhân khẩu
    @Transactional(readOnly = true)
    public ResidentDetailDTO getResidentById(Long id) {
        Resident r = residentRepository.findById(id)
                .orElseThrow(() -> new NotFoundException(
                        "RESIDENT_NOT_FOUND",
                        "Không tìm thấy nhân khẩu id = " + id));
        return residentMapper.toDetail(r);
    }

    // Helper
    private Resident findActiveResidentOrThrow(Long id) {
        Resident r = residentRepository.findById(id)
                .orElseThrow(() -> new NotFoundException(
                        "RESIDENT_NOT_FOUND",
                        "Không tìm thấy nhân khẩu id = " + id));

        if (r.getStatus() != ResidentStatus.ACTIVE) {
            throw new BadRequestException(
                    "RESIDENT_NOT_ACTIVE",
                    "Nhân khẩu đã chuyển đi (MOVED_OUT), không thể thao tác");
        }
        return r;
    }
}
