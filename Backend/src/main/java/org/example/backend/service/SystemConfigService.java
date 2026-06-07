package org.example.backend.service;

import org.example.backend.dto.SystemConfigDTO;
import org.example.backend.aspect.LogAdminAction;
import org.example.backend.entity.SystemConfig;
import org.example.backend.exception.BadRequestException;
import org.example.backend.exception.NotFoundException;
import org.example.backend.repository.SystemConfigRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;

/**
 * Quản lý cấu hình đơn giá gốc của hệ thống (đơn giá điện/nước/internet...).
 * Admin chỉnh sửa đơn giá ở đây; các hoá đơn sinh hoạt sẽ dùng đơn giá mới khi tạo về sau.
 */
@Service
public class SystemConfigService {

    private final SystemConfigRepository repository;

    public SystemConfigService(SystemConfigRepository repository) {
        this.repository = repository;
    }

    @Transactional(readOnly = true)
    public List<SystemConfigDTO> getAll() {
        return repository.findAll().stream().map(this::toDto).toList();
    }

    /** Lấy đơn giá theo key; ném lỗi nếu chưa được cấu hình. */
    @Transactional(readOnly = true)
    public BigDecimal getValue(String key) {
        return repository.findByConfigKey(key)
                .map(SystemConfig::getConfigValue)
                .orElseThrow(() -> new BadRequestException(
                        "SYSTEM_CONFIG_MISSING",
                        "Chưa cấu hình đơn giá cho '" + key + "' trong hệ thống"));
    }

    /** Cập nhật giá trị đơn giá theo key. */
    @LogAdminAction(entity = "SystemConfig", action = "UPDATE", description = "Cập nhật đơn giá hệ thống",
            detail = "#key + ' = ' + #value")
    @Transactional
    public SystemConfigDTO updateValue(String key, BigDecimal value) {
        if (value == null || value.compareTo(BigDecimal.ZERO) < 0) {
            throw new BadRequestException("INVALID_CONFIG_VALUE", "Giá trị đơn giá không hợp lệ");
        }
        SystemConfig config = repository.findByConfigKey(key)
                .orElseThrow(() -> new NotFoundException(
                        "SYSTEM_CONFIG_NOT_FOUND", "Không tìm thấy cấu hình '" + key + "'"));
        config.setConfigValue(value);
        return toDto(repository.save(config));
    }

    private SystemConfigDTO toDto(SystemConfig c) {
        SystemConfigDTO dto = new SystemConfigDTO();
        dto.setId(c.getId());
        dto.setConfigKey(c.getConfigKey());
        dto.setConfigValue(c.getConfigValue());
        dto.setDescription(c.getDescription());
        return dto;
    }
}
