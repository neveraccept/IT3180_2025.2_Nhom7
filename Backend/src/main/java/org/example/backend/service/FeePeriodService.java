package org.example.backend.service;

import org.example.backend.dto.FeePeriodDTO;
import org.example.backend.entity.Fee;
import org.example.backend.entity.FeePeriod;
import org.example.backend.repository.FeePeriodRepository;
import org.example.backend.repository.FeeRepository;
import org.springframework.beans.BeanUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class FeePeriodService {

    @Autowired
    private FeePeriodRepository feePeriodRepository;

    @Autowired
    private FeeRepository feeRepository;

    public Page<FeePeriodDTO> getAllFeePeriods(Pageable pageable) {
        return feePeriodRepository.findAll(pageable).map(this::convertToDto);
    }

    public FeePeriodDTO getFeePeriodById(Long id) {
        FeePeriod feePeriod = feePeriodRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Đợt thu phí không tồn tại"));
        return convertToDto(feePeriod);
    }

    @Transactional
    public FeePeriodDTO createFeePeriod(FeePeriodDTO dto) {
        Fee fee = feeRepository.findById(dto.getFeeId())
                .orElseThrow(() -> new RuntimeException("Khoản thu không tồn tại"));

        FeePeriod feePeriod = new FeePeriod();
        BeanUtils.copyProperties(dto, feePeriod, "id");
        feePeriod.setFee(fee);
        feePeriod.setStatus("OPEN");
        feePeriod = feePeriodRepository.save(feePeriod);

        // TODO: Generate Payments for MANDATORY fees for all active households

        return convertToDto(feePeriod);
    }

    @Transactional
    public FeePeriodDTO updateFeePeriod(Long id, FeePeriodDTO dto) {
        FeePeriod feePeriod = feePeriodRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Đợt thu phí không tồn tại"));

        feePeriod.setName(dto.getName());
        feePeriod.setStartDate(dto.getStartDate());
        feePeriod.setEndDate(dto.getEndDate());
        return convertToDto(feePeriodRepository.save(feePeriod));
    }

    @Transactional
    public void closeFeePeriod(Long id) {
        FeePeriod feePeriod = feePeriodRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Đợt thu phí không tồn tại"));
        feePeriod.setStatus("CLOSED");
        feePeriodRepository.save(feePeriod);
    }

    private FeePeriodDTO convertToDto(FeePeriod entity) {
        FeePeriodDTO dto = new FeePeriodDTO();
        BeanUtils.copyProperties(entity, dto);
        if (entity.getFee() != null) {
            dto.setFeeId(entity.getFee().getId());
        }
        return dto;
    }
}
