package org.example.backend.service;

import org.example.backend.dto.AuditLogDTO;
import org.example.backend.dto.response.PageResponse;
import org.example.backend.entity.AuditLog;
import org.example.backend.repository.AuditLogRepository;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AuditLogService {
    private final AuditLogRepository auditLogRepository;

    public AuditLogService(AuditLogRepository auditLogRepository) {
        this.auditLogRepository = auditLogRepository;
    }

    /**
     * Ghi một bản ghi nhật ký. Tách transaction riêng (REQUIRES_NEW) để việc ghi log
     * không bị cuốn theo (rollback) cùng transaction nghiệp vụ nếu có sự cố sau đó.
     */
    @Transactional(propagation = org.springframework.transaction.annotation.Propagation.REQUIRES_NEW)
    public void record(String adminUsername, String action, String targetEntity, String details) {
        AuditLog log = AuditLog.builder()
                .adminUsername(adminUsername)
                .action(action)
                .targetEntity(targetEntity)
                .details(details)
                .build();
        auditLogRepository.save(log);
    }

    /**
     * Lấy danh sách nhật ký có phân trang (controller truyền Pageable sort timestamp desc).
     * Loại trừ bản ghi "SYSTEM" cũ: nhật ký chỉ phản ánh thao tác của Admin.
     */
    @Transactional(readOnly = true)
    public PageResponse<AuditLogDTO> getLogs(Pageable pageable) {
        return PageResponse.of(
                auditLogRepository.findByAdminUsernameNot("SYSTEM", pageable).map(this::toDto));
    }

    private AuditLogDTO toDto(AuditLog log) {
        return new AuditLogDTO(
                log.getId(),
                log.getAdminUsername(),
                log.getAction(),
                log.getTargetEntity(),
                log.getDetails(),
                log.getTimestamp()
        );
    }
}
