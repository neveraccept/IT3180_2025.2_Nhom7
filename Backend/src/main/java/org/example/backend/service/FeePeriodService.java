package org.example.backend.service;

import org.example.backend.aspect.AuditContext;
import org.example.backend.aspect.LogAdminAction;
import org.example.backend.dto.FeePeriodDTO;
import org.example.backend.entity.Fee;
import org.example.backend.entity.FeePeriod;
import org.example.backend.entity.Household;
import org.example.backend.entity.Payment;
import org.example.backend.entity.PaymentTransaction;
import org.example.backend.entity.enums.HouseholdStatus;
import org.example.backend.entity.enums.ResidentStatus;
import org.example.backend.exception.NotFoundException;
import org.example.backend.repository.FeePeriodRepository;
import org.example.backend.repository.FeeRepository;
import org.example.backend.repository.HouseholdRepository;
import org.example.backend.repository.PaymentRepository;
import org.example.backend.repository.PaymentTransactionRepository;
import org.example.backend.repository.ResidentRepository;
import org.springframework.beans.BeanUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

@Service
public class FeePeriodService {

    @Autowired
    private FeePeriodRepository feePeriodRepository;

    @Autowired
    private FeeRepository feeRepository;

    @Autowired
    private HouseholdRepository householdRepository;

    @Autowired
    private ResidentRepository residentRepository;

    @Autowired
    private PaymentRepository paymentRepository;

    @Autowired
    private PaymentTransactionRepository paymentTransactionRepository;

    public Page<FeePeriodDTO> getAllFeePeriods(Pageable pageable) {
        return feePeriodRepository.findAll(pageable).map(this::convertToDto);
    }

    public FeePeriodDTO getFeePeriodById(Long id) {
        FeePeriod feePeriod = feePeriodRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("FEE_PERIOD_NOT_FOUND", "Đợt thu phí không tồn tại"));
        return convertToDto(feePeriod);
    }

    @LogAdminAction(entity = "FeePeriod", action = "CREATE", description = "Tạo đợt thu phí & sinh phiếu thu cho các hộ",
            detail = "'Đợt thu: ' + #result.name")
    @Transactional
    public FeePeriodDTO createFeePeriod(FeePeriodDTO dto) {
        Fee fee = feeRepository.findById(dto.getFeeId())
                .orElseThrow(() -> new NotFoundException("FEE_NOT_FOUND", "Khoản thu không tồn tại"));

        FeePeriod feePeriod = new FeePeriod();
        BeanUtils.copyProperties(dto, feePeriod, "id");
        feePeriod.setFee(fee);
        feePeriod.setStatus("OPEN");
        feePeriod = feePeriodRepository.save(feePeriod);

        // Tự sinh phiếu thu (Payment) cho toàn bộ hộ đang hoạt động.
        // Số tiền (amountDue) tính theo đơn giá hiện hành của khoản thu -> sửa unitPrice ở Fee
        // sẽ tự động áp dụng cho các đợt thu tạo về sau.
        generatePayments(feePeriod, fee);

        return convertToDto(feePeriod);
    }

    /**
     * Backfill: sinh phiếu thu cho các đợt thu đang tồn tại nhưng CHƯA có phiếu nào
     * Idempotent — đợt nào đã có phiếu sẽ được bỏ qua. Trả về số đợt được backfill.
     */
    @LogAdminAction(entity = "FeePeriod", action = "UPDATE", description = "Backfill sinh phiếu thu còn thiếu cho các đợt thu",
            detail = "'Số phiếu sinh thêm: ' + #result")
    @Transactional
    public int backfillMissingPayments() {
        int periodsFixed = 0;
        for (FeePeriod period : feePeriodRepository.findAll()) {
            if (period.getFee() == null) continue;
            if (paymentRepository.countByFeePeriod_Id(period.getId()) > 0) continue;
            generatePayments(period, period.getFee());
            periodsFixed++;
        }
        return periodsFixed;
    }

    /**
     * Sinh phiếu thu cho mọi hộ ACTIVE dựa trên đơn vị tính của khoản thu:
     *  - PER_M2: diện tích căn hộ * đơn giá
     *  - PER_PERSON: số nhân khẩu ACTIVE * đơn giá
     *  - PER_HOUSEHOLD / FIXED: đơn giá (cố định theo hộ)
     *  - Khoản tự nguyện (DONATION) / NONE: amountDue = 0 (cư dân tự nhập khi đóng góp)
     */
    private void generatePayments(FeePeriod feePeriod, Fee fee) {
        List<Household> households = householdRepository.findByStatus(HouseholdStatus.ACTIVE);
        List<Payment> payments = new ArrayList<>(households.size());
        for (Household household : households) {
            Payment p = new Payment();
            p.setFeePeriod(feePeriod);
            p.setHousehold(household);
            p.setAmountDue(computeAmountDue(fee, household));
            p.setAmountPaid(BigDecimal.ZERO);
            p.setStatus(Payment.STATUS_UNPAID);
            payments.add(p);
        }
        paymentRepository.saveAll(payments);
    }

    private BigDecimal computeAmountDue(Fee fee, Household household) {
        BigDecimal unitPrice = fee.getUnitPrice() == null ? BigDecimal.ZERO : fee.getUnitPrice();
        if ("DONATION".equals(fee.getType())) {
            return BigDecimal.ZERO;
        }
        String unit = fee.getUnit() == null ? "" : fee.getUnit();
        return switch (unit) {
            case "PER_M2" -> {
                BigDecimal area = household.getApartment() != null && household.getApartment().getArea() != null
                        ? household.getApartment().getArea()
                        : BigDecimal.ZERO;
                yield unitPrice.multiply(area);
            }
            case "PER_PERSON" -> {
                long members = residentRepository.countByHousehold_IdAndStatus(
                        household.getId(), ResidentStatus.ACTIVE);
                yield unitPrice.multiply(BigDecimal.valueOf(members));
            }
            // PER_HOUSEHOLD, FIXED, PER_VEHICLE, NONE... -> cố định theo đơn giá.
            default -> unitPrice;
        };
    }

    @LogAdminAction(entity = "FeePeriod", action = "UPDATE", description = "Cập nhật đợt thu phí",
            detail = "'Đợt thu: ' + #result.name")
    @Transactional
    public FeePeriodDTO updateFeePeriod(Long id, FeePeriodDTO dto) {
        FeePeriod feePeriod = feePeriodRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("FEE_PERIOD_NOT_FOUND", "Đợt thu phí không tồn tại"));

        feePeriod.setName(dto.getName());
        feePeriod.setStartDate(dto.getStartDate());
        feePeriod.setEndDate(dto.getEndDate());
        return convertToDto(feePeriodRepository.save(feePeriod));
    }

    @LogAdminAction(entity = "FeePeriod", action = "UPDATE", description = "Đóng đợt thu phí (CLOSED)")
    @Transactional
    public void closeFeePeriod(Long id) {
        FeePeriod feePeriod = feePeriodRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("FEE_PERIOD_NOT_FOUND", "Đợt thu phí không tồn tại"));
        feePeriod.setStatus("CLOSED");
        feePeriodRepository.save(feePeriod);

        // 1) Hủy các giao dịch đơn lẻ (FEE_PAYMENT) đang PENDING của đợt này.
        paymentTransactionRepository.updatePendingFeeTransactionsByFeePeriod(
                id,
                PaymentTransaction.TARGET_FEE_PAYMENT,
                PaymentTransaction.STATUS_PENDING,
                PaymentTransaction.STATUS_CANCELLED);

        // 2) Hủy thêm các giao dịch batch (FEE_PAYMENT_BATCH / MIXED_PAYMENT_BATCH) đang PENDING
        //    có chứa phiếu thu thuộc đợt vừa đóng — nếu không, cư dân vẫn có thể hoàn tất
        //    thanh toán VNPay cho một đợt đã CLOSED qua luồng batch.
        cancelPendingBatchTransactionsOfPeriod(id);

        AuditContext.detail("Đóng đợt thu: " + feePeriod.getName());
    }

    /**
     * Quét các giao dịch batch đang PENDING và hủy những giao dịch có ít nhất một phiếu thu
     * UNPAID thuộc đợt thu vừa đóng. Danh sách phiếu của batch được lưu dạng chuỗi id
     * (cách nhau dấu phẩy) trong cột {@code targetIds}.
     */
    private void cancelPendingBatchTransactionsOfPeriod(Long feePeriodId) {
        Set<Long> unpaidPaymentIds = new HashSet<>(
                paymentRepository.findIdsByFeePeriodAndStatus(feePeriodId, Payment.STATUS_UNPAID));
        if (unpaidPaymentIds.isEmpty()) {
            return;
        }

        List<PaymentTransaction> pendingBatches = paymentTransactionRepository.findByTargetTypeInAndStatus(
                List.of(PaymentTransaction.TARGET_FEE_PAYMENT_BATCH,
                        PaymentTransaction.TARGET_MIXED_PAYMENT_BATCH),
                PaymentTransaction.STATUS_PENDING);

        List<PaymentTransaction> toCancel = new ArrayList<>();
        for (PaymentTransaction tx : pendingBatches) {
            if (batchContainsAnyPayment(tx.getTargetIds(), unpaidPaymentIds)) {
                tx.setStatus(PaymentTransaction.STATUS_CANCELLED);
                toCancel.add(tx);
            }
        }
        if (!toCancel.isEmpty()) {
            paymentTransactionRepository.saveAll(toCancel);
        }
    }

    /** Kiểm tra chuỗi id phiếu thu (vd "12,15,20") có giao với tập phiếu của đợt vừa đóng không. */
    private boolean batchContainsAnyPayment(String targetIds, Set<Long> paymentIds) {
        if (targetIds == null || targetIds.isBlank()) {
            return false;
        }
        for (String part : targetIds.split(",")) {
            String trimmed = part.trim();
            if (trimmed.isEmpty()) continue;
            try {
                if (paymentIds.contains(Long.valueOf(trimmed))) {
                    return true;
                }
            } catch (NumberFormatException ignored) {
                // Bỏ qua phần tử không phải số.
            }
        }
        return false;
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
