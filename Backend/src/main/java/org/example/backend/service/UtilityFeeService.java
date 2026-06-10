package org.example.backend.service;

import org.example.backend.aspect.LogAdminAction;
import org.example.backend.dto.UtilityFeeGenerationResultDTO;
import org.example.backend.entity.Fee;
import org.example.backend.entity.FeePeriod;
import org.example.backend.entity.Household;
import org.example.backend.entity.Payment;
import org.example.backend.entity.SystemConfig;
import org.example.backend.entity.UtilityBill;
import org.example.backend.entity.enums.UtilityBillStatus;
import org.example.backend.entity.enums.UtilityType;
import org.example.backend.exception.BadRequestException;
import org.example.backend.repository.FeePeriodRepository;
import org.example.backend.repository.FeeRepository;
import org.example.backend.repository.PaymentRepository;
import org.example.backend.repository.UtilityBillRepository;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.YearMonth;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Sinh hóa đơn phí điện/nước/internet hàng tháng cho từng hộ dân.
 *
 * Cơ chế giống {@link ParkingFeeService}: tận dụng hệ thống Payment sẵn có — tạo một đợt thu
 * (FeePeriod) gắn với khoản "Phí điện nước", rồi sinh một phiếu nộp (Payment) cho mỗi hộ với
 * số tiền = tổng các hóa đơn điện/nước/internet CHƯA NỘP của hộ trong tháng đó. Nhờ vậy hoá
 * đơn hiện ngay ở trang Thu phí / Công nợ và hộ dân thanh toán được qua VNPay hoặc tiền mặt.
 */
@Service
public class UtilityFeeService {

    /** Tên khoản thu hệ thống dùng cho phí điện nước (tự tạo lần đầu nếu chưa có). */
    public static final String UTILITY_FEE_NAME = "Phí điện nước";

    private final FeeRepository feeRepository;
    private final FeePeriodRepository feePeriodRepository;
    private final PaymentRepository paymentRepository;
    private final UtilityBillRepository billRepository;
    private final SystemConfigService systemConfigService;

    public UtilityFeeService(FeeRepository feeRepository,
                             FeePeriodRepository feePeriodRepository,
                             PaymentRepository paymentRepository,
                             UtilityBillRepository billRepository,
                             SystemConfigService systemConfigService) {
        this.feeRepository = feeRepository;
        this.feePeriodRepository = feePeriodRepository;
        this.paymentRepository = paymentRepository;
        this.billRepository = billRepository;
        this.systemConfigService = systemConfigService;
    }

    @LogAdminAction(entity = "FeePeriod", action = "CREATE",
            description = "Sinh hóa đơn phí điện nước theo tháng",
            detail = "'Đợt thu: ' + #result.feePeriodName() + ' — ' + #result.invoiceCount() + ' hộ'")
    @Transactional
    public UtilityFeeGenerationResultDTO generateInvoices(int month, int year) {
        Fee fee = getOrCreateUtilityFee();
        String periodName = "Phí điện nước tháng " + month + "/" + year;
        if (feePeriodRepository.existsByFeeIdAndName(fee.getId(), periodName)) {
            throw new BadRequestException("UTILITY_FEE_PERIOD_EXISTS",
                    "Đã tạo hóa đơn phí điện nước cho tháng " + month + "/" + year);
        }

        // Gom tổng số tiền hóa đơn CHƯA NỘP theo hộ trong tháng/năm chỉ định.
        List<UtilityBill> bills = billRepository
                .search(null, null, month, year, UtilityBillStatus.UNPAID, Pageable.unpaged())
                .getContent();
        Map<Long, BigDecimal> feeByHouseholdId = new LinkedHashMap<>();
        Map<Long, Household> householdById = new LinkedHashMap<>();
        for (UtilityBill b : bills) {
            Household h = b.getHousehold();
            if (h == null) {
                continue;
            }
            BigDecimal amount = computeCurrentAmount(b);
            if (amount.signum() <= 0) {
                continue;
            }
            b.setAmount(amount);
            feeByHouseholdId.merge(h.getId(), amount, BigDecimal::add);
            householdById.putIfAbsent(h.getId(), h);
        }

        if (feeByHouseholdId.isEmpty()) {
            throw new BadRequestException("NO_UTILITY_FEE",
                    "Không có hóa đơn điện/nước chưa nộp nào trong tháng " + month + "/" + year
                            + " để tạo hóa đơn phí điện nước");
        }

        YearMonth ym = YearMonth.of(year, month);
        FeePeriod period = new FeePeriod();
        period.setFee(fee);
        period.setName(periodName);
        period.setStartDate(ym.atDay(1));
        period.setEndDate(ym.atEndOfMonth());
        period.setStatus("OPEN");
        period = feePeriodRepository.save(period);

        List<Payment> payments = new ArrayList<>(feeByHouseholdId.size());
        BigDecimal total = BigDecimal.ZERO;
        for (Map.Entry<Long, BigDecimal> entry : feeByHouseholdId.entrySet()) {
            Payment p = new Payment();
            p.setFeePeriod(period);
            p.setHousehold(householdById.get(entry.getKey()));
            p.setAmountDue(entry.getValue());
            p.setAmountPaid(BigDecimal.ZERO);
            p.setStatus(Payment.STATUS_UNPAID);
            payments.add(p);
            total = total.add(entry.getValue());
        }
        paymentRepository.saveAll(payments);

        return new UtilityFeeGenerationResultDTO(
                period.getId(), period.getName(), payments.size(), total);
    }

    /** Lấy khoản thu "Phí điện nước"; tạo mới (MANDATORY, PER_HOUSEHOLD) nếu chưa tồn tại. */
    private Fee getOrCreateUtilityFee() {
        return feeRepository.findByName(UTILITY_FEE_NAME).orElseGet(() -> {
            Fee f = new Fee();
            f.setName(UTILITY_FEE_NAME);
            f.setType("MANDATORY");
            f.setUnit("PER_HOUSEHOLD");
            f.setUnitPrice(BigDecimal.ZERO);
            f.setDescription("Khoản thu phí điện/nước/internet hàng tháng — tổng các hóa đơn chưa nộp của hộ.");
            f.setActive(true);
            return feeRepository.save(f);
        });
    }

    private BigDecimal computeCurrentAmount(UtilityBill bill) {
        UtilityType type = bill.getType();
        if (type == UtilityType.ELECTRICITY || type == UtilityType.WATER) {
            Integer oldIndex = bill.getOldIndex();
            Integer newIndex = bill.getNewIndex();
            if (oldIndex == null || newIndex == null) {
                throw new BadRequestException("UTILITY_INDEX_REQUIRED",
                        "Hóa đơn điện/nước cần nhập chỉ số cũ và chỉ số mới");
            }
            if (newIndex < oldIndex) {
                throw new BadRequestException("UTILITY_INDEX_INVALID",
                        "Chỉ số mới phải lớn hơn hoặc bằng chỉ số cũ");
            }
            String key = type == UtilityType.ELECTRICITY
                    ? SystemConfig.ELECTRICITY_UNIT_PRICE
                    : SystemConfig.WATER_UNIT_PRICE;
            return systemConfigService.getValue(key)
                    .multiply(BigDecimal.valueOf((long) newIndex - oldIndex));
        }
        return systemConfigService.getValue(SystemConfig.INTERNET_PRICE);
    }
}
