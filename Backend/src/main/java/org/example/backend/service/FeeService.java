package org.example.backend.service;

import org.example.backend.dto.FeeDTO;
import org.example.backend.entity.Fee;
import org.example.backend.repository.FeePeriodRepository;
import org.example.backend.repository.FeeRepository;
import org.springframework.beans.BeanUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.Set;

@Service
public class FeeService {

    /**
     * Các đơn vị tính hợp lệ cho khoản thu.
     * - PER_M2: theo m² diện tích căn hộ
     * - PER_PERSON: theo số nhân khẩu trong hộ
     * - PER_HOUSEHOLD / FIXED: cố định theo hộ
     * - PER_VEHICLE: theo số phương tiện
     * - NONE: không áp đơn giá (dùng cho khoản tự nguyện, cư dân tự nhập số tiền)
     */
    private static final Set<String> VALID_UNITS =
            Set.of("PER_M2", "PER_PERSON", "PER_HOUSEHOLD", "PER_VEHICLE", "FIXED", "NONE");

    @Autowired
    private FeeRepository feeRepository;

    @Autowired
    private FeePeriodRepository feePeriodRepository;

    @Transactional
    public FeeDTO createFee(FeeDTO dto) {
        if(feeRepository.existsByName(dto.getName())) {
            throw new RuntimeException("Tên khoản thu đã tồn tại");
        }
        normalizeAndValidate(dto);
        Fee fee = new Fee();
        BeanUtils.copyProperties(dto, fee, "id");
        fee.setActive(true);
        return convertToDto(feeRepository.save(fee));
    }

    @Transactional
    public FeeDTO updateFee(Long id, FeeDTO dto) {
        Fee fee = feeRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Khoản thu không tồn tại"));

        if(!fee.getName().equals(dto.getName()) && feeRepository.existsByName(dto.getName())) {
            throw new RuntimeException("Tên khoản thu đã tồn tại");
        }

        normalizeAndValidate(dto);
        fee.setName(dto.getName());
        fee.setType(dto.getType());
        fee.setUnitPrice(dto.getUnitPrice());
        fee.setUnit(dto.getUnit());
        fee.setDescription(dto.getDescription());
        return convertToDto(feeRepository.save(fee));
    }

    /**
     * Chuẩn hoá & kiểm tra dữ liệu khoản thu trước khi lưu.
     * - Khoản tự nguyện (DONATION): không áp đơn giá -> unit = NONE, unitPrice = 0
     *   (cư dân chủ động nhập số tiền khi thanh toán).
     * - Khoản bắt buộc (MANDATORY): đơn vị tính phải nằm trong danh sách hợp lệ
     *   (bao gồm PER_PERSON - tính theo số người).
     */
    private void normalizeAndValidate(FeeDTO dto) {
        String type = dto.getType();
        if (type == null || (!type.equals("MANDATORY") && !type.equals("DONATION"))) {
            throw new RuntimeException("Loại khoản thu không hợp lệ (chỉ MANDATORY hoặc DONATION)");
        }

        if ("DONATION".equals(type)) {
            dto.setUnit("NONE");
            dto.setUnitPrice(BigDecimal.ZERO);
            return;
        }

        String unit = dto.getUnit();
        if (unit == null || !VALID_UNITS.contains(unit)) {
            throw new RuntimeException("Đơn vị tính không hợp lệ. Cho phép: " + VALID_UNITS);
        }
        if (dto.getUnitPrice() == null || dto.getUnitPrice().compareTo(BigDecimal.ZERO) <= 0) {
            throw new RuntimeException("Khoản thu bắt buộc phải có đơn giá lớn hơn 0");
        }
    }

    @Transactional
    public void deleteOrDeactivateFee(Long id) {
        Fee fee = feeRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Khoản thu không tồn tại"));

        boolean hasPeriods = feePeriodRepository.existsByFeeId(id);
        // Tương tự check bảng payments nếu cần
        if(hasPeriods) {
            fee.setActive(false);
            feeRepository.save(fee);
        } else {
            feeRepository.delete(fee);
        }
    }

    private FeeDTO convertToDto(Fee entity) {
        FeeDTO dto = new FeeDTO();
        BeanUtils.copyProperties(entity, dto);
        return dto;
    }

    public org.springframework.data.domain.Page<FeeDTO> getAllFees(org.springframework.data.domain.Pageable pageable) {
        return feeRepository.findAll(pageable).map(this::convertToDto);
    }

    public org.springframework.data.domain.Page<FeeDTO> searchFees(String keyword, String type, Boolean active, org.springframework.data.domain.Pageable pageable) {
        return feeRepository.searchFees(keyword, type, active, pageable).map(this::convertToDto);
    }

    public FeeDTO getFeeById(Long id) {
        Fee fee = feeRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Khoản thu không tồn tại"));
        return convertToDto(fee);
    }
}