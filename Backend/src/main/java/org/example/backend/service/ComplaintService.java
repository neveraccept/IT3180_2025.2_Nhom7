package org.example.backend.service;

import org.example.backend.dto.ComplaintDTO;
import org.example.backend.dto.response.PageResponse;
import org.example.backend.dto.request.ComplaintCreateRequest;
import org.example.backend.dto.request.ComplaintResponseRequest;
import org.example.backend.entity.Complaint;
import org.example.backend.entity.User;
import org.example.backend.entity.enums.ComplaintCategory;
import org.example.backend.entity.enums.ComplaintStatus;
import org.example.backend.exception.BadRequestException;
import org.example.backend.exception.NotFoundException;
import org.example.backend.repository.ComplaintRepository;
import org.example.backend.security.CurrentUserService;
import org.example.backend.service.mapper.ComplaintMapper;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Service
public class ComplaintService {

    private final ComplaintRepository complaintRepository;
    private final ComplaintMapper mapper;
    private final CurrentUserService currentUserService;

    public ComplaintService(ComplaintRepository complaintRepository,
                            ComplaintMapper mapper,
                            CurrentUserService currentUserService) {
        this.complaintRepository = complaintRepository;
        this.mapper = mapper;
        this.currentUserService = currentUserService;
    }

    // F8.1 – Cư dân gửi khiếu nại

    @Transactional
    public ComplaintDTO create(ComplaintCreateRequest req) {
        User sender = currentUserService.getCurrentUser();

        // Cư dân phải đã được gán vào một hộ mới gửi khiếu nại được
        if (sender.getHousehold() == null) {
            throw new BadRequestException(
                    "NO_HOUSEHOLD",
                    "Tài khoản chưa được gán vào hộ dân nào nên không thể gửi khiếu nại.");
        }

        Complaint c = new Complaint();
        c.setSender(sender);
        c.setHousehold(sender.getHousehold());
        c.setTitle(req.title().trim());
        c.setCategory(req.category());
        c.setContent(req.content());
        c.setStatus(ComplaintStatus.NEW);

        Complaint saved = complaintRepository.save(c);

        return mapper.toDto(saved);
    }

    // F8.1 (xem) – Cư dân xem khiếu nại của mình (filter theo sender_user_id)

    @Transactional(readOnly = true)
    public PageResponse<ComplaintDTO> getMyComplaints(Pageable pageable) {
        User me = currentUserService.getCurrentUser();
        Page<ComplaintDTO> page = complaintRepository
                .findBySenderId(me.getId(), pageable)
                .map(mapper::toDto);
        return PageResponse.of(page);
    }

    // Xem chi tiết 1 khiếu nại – Admin xem mọi cái, cư dân chỉ xem của mình

    @Transactional(readOnly = true)
    public ComplaintDTO getById(Long id) {
        Complaint c = requireComplaint(id);

        // RESIDENT chỉ được xem khiếu nại do chính mình gửi → ngược lại 403
        if (!currentUserService.isAdmin()) {
            User me = currentUserService.getCurrentUser();
            if (!c.getSender().getId().equals(me.getId())) {
                throw new AccessDeniedException("Bạn không có quyền xem khiếu nại này");
            }
        }
        return mapper.toDto(c);
    }

    // F8.2 – Admin xem danh sách khiếu nại (lọc tuỳ chọn theo status/category)

    @Transactional(readOnly = true)
    public PageResponse<ComplaintDTO> list(ComplaintStatus status,
                                           ComplaintCategory category,
                                           Pageable pageable) {
        Page<ComplaintDTO> page = complaintRepository
                .search(status, category, pageable)
                .map(mapper::toDto);
        return PageResponse.of(page);
    }

    // F8.3 + F8.4 – Admin phản hồi / đánh dấu đã xử lý

    @Transactional
    public ComplaintDTO respond(Long id, ComplaintResponseRequest req) {
        // Không cho đặt lại trạng thái về NEW qua API phản hồi
        if (req.status() == ComplaintStatus.NEW) {
            throw new BadRequestException(
                    "INVALID_STATUS_TRANSITION",
                    "Trạng thái xử lý chỉ được là IN_PROGRESS, RESOLVED hoặc REJECTED.");
        }

        Complaint c = requireComplaint(id);

        // Khiếu nại đã đóng (RESOLVED/REJECTED) thì không xử lý lại
        if (c.getStatus() == ComplaintStatus.RESOLVED
                || c.getStatus() == ComplaintStatus.REJECTED) {
            throw new BadRequestException(
                    "COMPLAINT_ALREADY_CLOSED",
                    "Khiếu nại đã được đóng (" + c.getStatus() + "), không thể xử lý lại.");
        }

        User admin = currentUserService.getCurrentUser();
        // Chỉ ghi đè nội dung phản hồi khi admin có nhập; nếu để trống thì giữ nguyên
        // nội dung cũ (cho phép chuyển trạng thái nhanh mà không bắt buộc nhập phản hồi).
        if (req.response() != null && !req.response().isBlank()) {
            c.setResponse(req.response().trim());
        }
        c.setStatus(req.status());
        c.setHandledBy(admin);
        c.setRespondedAt(LocalDateTime.now());

        Complaint saved = complaintRepository.save(c);

        return mapper.toDto(saved);
    }

    // Helpers

    private Complaint requireComplaint(Long id) {
        return complaintRepository.findById(id)
                .orElseThrow(() -> new NotFoundException(
                        "COMPLAINT_NOT_FOUND",
                        "Không tìm thấy khiếu nại id=" + id));
    }
}