package org.example.backend.service;

import org.example.backend.aspect.LogAdminAction;
import org.example.backend.dto.ParkingFeeGenerationResultDTO;
import org.example.backend.entity.Fee;
import org.example.backend.entity.FeePeriod;
import org.example.backend.entity.Household;
import org.example.backend.entity.ParkingRegistration;
import org.example.backend.entity.Payment;
import org.example.backend.entity.SystemConfig;
import org.example.backend.entity.enums.ParkingRegistrationStatus;
import org.example.backend.entity.enums.VehicleType;
import org.example.backend.exception.BadRequestException;
import org.example.backend.repository.FeePeriodRepository;
import org.example.backend.repository.FeeRepository;
import org.example.backend.repository.ParkingRegistrationRepository;
import org.example.backend.repository.PaymentRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.YearMonth;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Sinh hóa đơn phí gửi xe hàng tháng cho từng hộ dân.
 *
 * Cơ chế: tận dụng hệ thống Payment sẵn có — tạo một đợt thu (FeePeriod) gắn với khoản
 * "Phí gửi xe", rồi sinh một phiếu nộp (Payment) cho mỗi hộ với số tiền = tổng phí tháng
 * (monthlyFee) của các lượt gửi xe đang hiệu lực của hộ. Nhờ vậy hóa đơn hiện ngay ở trang
 * Thu phí / Công nợ và hộ dân thanh toán được qua VNPay hoặc tiền mặt như các khoản khác.
 */
@Service
public class ParkingFeeService {

    /** Tên khoản thu hệ thống dùng cho phí gửi xe (tự tạo lần đầu nếu chưa có). */
    public static final String PARKING_FEE_NAME = "Phí gửi xe";

    private final FeeRepository feeRepository;
    private final FeePeriodRepository feePeriodRepository;
    private final PaymentRepository paymentRepository;
    private final ParkingRegistrationRepository registrationRepository;
    private final SystemConfigService systemConfigService;

    public ParkingFeeService(FeeRepository feeRepository,
                             FeePeriodRepository feePeriodRepository,
                             PaymentRepository paymentRepository,
                             ParkingRegistrationRepository registrationRepository,
                             SystemConfigService systemConfigService) {
        this.feeRepository = feeRepository;
        this.feePeriodRepository = feePeriodRepository;
        this.paymentRepository = paymentRepository;
        this.registrationRepository = registrationRepository;
        this.systemConfigService = systemConfigService;
    }

    @LogAdminAction(entity = "FeePeriod", action = "CREATE",
            description = "Sinh hóa đơn phí gửi xe theo tháng",
            detail = "'Đợt thu: ' + #result.feePeriodName() + ' — ' + #result.invoiceCount() + ' hộ'")
    @Transactional
    public ParkingFeeGenerationResultDTO generateInvoices(int month, int year) {
        Fee fee = getOrCreateParkingFee();
        String periodName = "Phí gửi xe tháng " + month + "/" + year;
        if (feePeriodRepository.existsByFeeIdAndName(fee.getId(), periodName)) {
            throw new BadRequestException("PARKING_FEE_PERIOD_EXISTS",
                    "Đã tạo hóa đơn phí gửi xe cho tháng " + month + "/" + year);
        }

        // Gom tổng phí tháng theo hộ từ các lượt gửi xe ACTIVE (chỉ lượt gắn với xe của hộ).
        List<ParkingRegistration> regs = registrationRepository
                .findActiveHouseholdRegistrations(ParkingRegistrationStatus.ACTIVE);
        Map<Long, BigDecimal> feeByHouseholdId = new LinkedHashMap<>();
        Map<Long, Household> householdById = new LinkedHashMap<>();
        for (ParkingRegistration r : regs) {
            if (r.getVehicle() == null || r.getVehicle().getHousehold() == null) {
                continue;
            }
            BigDecimal monthly = currentParkingFee(r);
            if (monthly.signum() <= 0) {
                continue;
            }
            Household h = r.getVehicle().getHousehold();
            feeByHouseholdId.merge(h.getId(), monthly, BigDecimal::add);
            householdById.putIfAbsent(h.getId(), h);
        }

        if (feeByHouseholdId.isEmpty()) {
            throw new BadRequestException("NO_PARKING_FEE",
                    "Không có lượt gửi xe nào đang hiệu lực để tạo hóa đơn phí gửi xe");
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

        return new ParkingFeeGenerationResultDTO(
                period.getId(), period.getName(), payments.size(), total);
    }

    /** Lấy khoản thu "Phí gửi xe"; tạo mới (MANDATORY, PER_VEHICLE) nếu chưa tồn tại. */
    private Fee getOrCreateParkingFee() {
        return feeRepository.findByName(PARKING_FEE_NAME).orElseGet(() -> {
            Fee f = new Fee();
            f.setName(PARKING_FEE_NAME);
            f.setType("MANDATORY");
            f.setUnit("PER_VEHICLE");
            f.setUnitPrice(BigDecimal.ZERO);
            f.setDescription("Khoản thu phí gửi xe hàng tháng — tổng phí các lượt gửi xe của hộ.");
            f.setActive(true);
            return feeRepository.save(f);
        });
    }

    private BigDecimal currentParkingFee(ParkingRegistration registration) {
        VehicleType type = registration.getVehicle().getType();
        String key = type == VehicleType.CAR
                ? SystemConfig.CAR_PARKING_PRICE
                : SystemConfig.MOTORBIKE_PARKING_PRICE;
        return systemConfigService.getValue(key);
    }
}
