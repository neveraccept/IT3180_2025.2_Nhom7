package org.example.backend.service;

import org.example.backend.dto.ApartmentDTO;
import org.example.backend.dto.ApartmentDetailDTO;
import org.example.backend.dto.response.PageResponse;
import org.example.backend.dto.request.ApartmentUpdateRequest;
import org.example.backend.entity.Apartment;
import org.example.backend.entity.Household;
import org.example.backend.entity.enums.ApartmentStatus;
import org.example.backend.entity.enums.HouseholdStatus;
import org.example.backend.exception.BadRequestException;
import org.example.backend.exception.NotFoundException;
import org.example.backend.repository.ApartmentRepository;
import org.example.backend.repository.HouseholdRepository;
import org.example.backend.service.mapper.ApartmentMapper;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
public class ApartmentService {

    private final ApartmentRepository apartmentRepository;
    private final HouseholdRepository householdRepository;
    private final ApartmentMapper mapper;

    public ApartmentService(ApartmentRepository apartmentRepository,
                            HouseholdRepository householdRepository,
                            ApartmentMapper mapper) {
        this.apartmentRepository = apartmentRepository;
        this.householdRepository = householdRepository;
        this.mapper = mapper;
    }


    //  Xem danh sách căn hộ (có phân trang)

    @Transactional(readOnly = true)
    public PageResponse<ApartmentDTO> list(Pageable pageable) {
        return PageResponse.of(toListDtoPage(apartmentRepository.findAll(pageable)));
    }

    // Tìm kiếm căn hộ (code, floor, status, headName)

    @Transactional(readOnly = true)
    public PageResponse<ApartmentDTO> search(String code,
                                             Integer floor,
                                             ApartmentStatus status,
                                             String headName,
                                             Pageable pageable) {

        String c = isBlank(code) ? null : code.trim();
        String h = isBlank(headName) ? null : headName.trim();

        return PageResponse.of(toListDtoPage(
                apartmentRepository.search(c, floor, status, h, pageable)));
    }

    // Xem chi tiết căn hộ kèm hộ dân đang ở

    @Transactional(readOnly = true)
    public ApartmentDetailDTO getDetail(Long id) {
        Apartment ap = requireApartment(id);
        Household active = householdRepository
                .findByApartmentIdAndStatus(id, HouseholdStatus.ACTIVE)
                .orElse(null);
        return mapper.toDetailDto(ap, active);
    }

    //  chỉnh sửa thông tin căn hộ

    @Transactional
    public ApartmentDetailDTO update(Long id, ApartmentUpdateRequest req) {
        Apartment ap = requireApartment(id);

        if (req.floor() != null) ap.setFloor(req.floor());
        if (req.area() != null) ap.setArea(req.area());
        if (req.note() != null) ap.setNote(req.note());

        if (req.status() != null && req.status() != ap.getStatus()) {
            applyStatusTransition(ap, req.status());
        }

        apartmentRepository.save(ap);

        Household active = householdRepository
                .findByApartmentIdAndStatus(id, HouseholdStatus.ACTIVE)
                .orElse(null);
        return mapper.toDetailDto(ap, active);
    }

    //  Helpers nội bộ

    //Đảm bảo căn hộ tồn tại, không – ném NotFound.
    public Apartment requireApartment(Long id) {
        return apartmentRepository.findById(id)
                .orElseThrow(() -> new NotFoundException(
                        "APARTMENT_NOT_FOUND",
                        "Không tìm thấy căn hộ id=" + id));
    }

     // tra luật chuyển trạng thái căn hộ khi Admin sửa "tay":

    private void applyStatusTransition(Apartment ap, ApartmentStatus newStatus) {
        boolean hasActive = householdRepository
                .existsByApartmentIdAndStatus(ap.getId(), HouseholdStatus.ACTIVE);

        // Người dùng đặt OCCUPIED bằng tay → không cho phép
        if (newStatus == ApartmentStatus.OCCUPIED && !hasActive) {
            throw new BadRequestException(
                    "INVALID_STATUS_TRANSITION",
                    "Không thể đặt OCCUPIED khi căn hộ chưa có hộ dân. " +
                            "Hãy dùng chức năng gán hộ (F2.7).");
        }

        // Đang OCCUPIED muốn chuyển sang trạng thái khác → phải chuyển hộ trước
        if (ap.getStatus() == ApartmentStatus.OCCUPIED
                && newStatus != ApartmentStatus.OCCUPIED) {
            throw new BadRequestException(
                    "INVALID_STATUS_TRANSITION",
                    "Căn hộ đang có hộ dân ACTIVE. Hãy chuyển hộ ra (F2.8) " +
                            "trước khi đổi trạng thái.");
        }

        // Đặt VAILABLE khi đã có hộ ACTIVE → cũng chặn để chắc chắn
        if (hasActive && (newStatus == ApartmentStatus.AVAILABLE)) {
            throw new BadRequestException(
                    "INVALID_STATUS_TRANSITION",
                    "Căn hộ đang có hộ dân ACTIVE, không thể chuyển sang " + newStatus);
        }

        ap.setStatus(newStatus);
    }

    /**
     * Map cả trang căn hộ sang DTO mà chỉ tốn 1 truy vấn để nạp hộ dân ACTIVE cho toàn bộ trang
     * (thay vì 1 truy vấn / căn hộ → tránh N+1).
     */
    private Page<ApartmentDTO> toListDtoPage(Page<Apartment> apartments) {
        List<Long> apartmentIds = apartments.getContent().stream()
                .map(Apartment::getId)
                .toList();

        Map<Long, Household> activeByApartmentId = apartmentIds.isEmpty()
                ? Map.of()
                : householdRepository
                        .findByApartmentIdInAndStatus(apartmentIds, HouseholdStatus.ACTIVE)
                        .stream()
                        .collect(Collectors.toMap(
                                h -> h.getApartment().getId(),
                                Function.identity(),
                                (a, b) -> a)); // mỗi căn hộ chỉ có tối đa 1 hộ ACTIVE

        return apartments.map(ap -> mapper.toListDto(ap, activeByApartmentId.get(ap.getId())));
    }

    private static boolean isBlank(String s) {
        return s == null || s.isBlank();
    }
}


