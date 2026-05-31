package org.example.backend.service;

import org.example.backend.dto.FeeDTO;
import org.example.backend.entity.Fee;
import org.example.backend.repository.FeePeriodRepository;
import org.example.backend.repository.FeeRepository;
import org.springframework.beans.BeanUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class FeeService {

    @Autowired
    private FeeRepository feeRepository;

    @Autowired
    private FeePeriodRepository feePeriodRepository;

    // ... Khai báo thêm AuditLogService nếu cần (AuditLog) ...

    @Transactional
    public FeeDTO createFee(FeeDTO dto) {
        if(feeRepository.existsByName(dto.getName())) {
            throw new RuntimeException("Tên khoản thu đã tồn tại");
        }
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

        fee.setName(dto.getName());
        fee.setType(dto.getType());
        fee.setUnitPrice(dto.getUnitPrice());
        fee.setUnit(dto.getUnit());
        fee.setDescription(dto.getDescription());
        return convertToDto(feeRepository.save(fee));
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
            // Ghi audit log: DEACTIVATE_FEE
        } else {
            feeRepository.delete(fee);
            // Ghi audit log: DELETE_FEE
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