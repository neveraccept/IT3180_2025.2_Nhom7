package org.example.backend.service;

import org.example.backend.aspect.AuditContext;
import org.example.backend.aspect.LogAdminAction;
import org.example.backend.dto.response.PageResponse;
import org.example.backend.dto.UtilityBillDTO;
import org.example.backend.dto.request.CreateUtilityBillRequest;
import org.example.backend.dto.request.UpdateUtilityBillRequest;
import org.example.backend.entity.Household;
import org.example.backend.entity.SystemConfig;
import org.example.backend.entity.UtilityBill;
import org.example.backend.entity.enums.PaymentMethod;
import org.example.backend.entity.enums.UtilityBillStatus;
import org.example.backend.entity.enums.UtilityType;
import org.example.backend.exception.BadRequestException;
import org.example.backend.exception.NotFoundException;
import org.example.backend.repository.HouseholdRepository;
import org.example.backend.repository.UtilityBillRepository;
import org.example.backend.security.CurrentUserService;
import org.example.backend.service.mapper.UtilityBillMapper;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * M7 - Quản lý hoá đơn điện/nước/internet.
 * F7.1 nhập hoá đơn, F7.2 sửa/xoá, F7.3 ghi nhận đã nộp tiền mặt, F7.4 tra cứu theo hộ.
 *
 * Quy ước: chỉ thao tác trên hoá đơn còn UNPAID khi sửa/xoá để giữ tính toàn vẹn đối soát.
 * Hoá đơn đã PAID (tiền mặt hoặc online qua VNPay) không được sửa/xoá.
 */
@Service
public class UtilityBillService {

    private final UtilityBillRepository billRepository;
    private final HouseholdRepository householdRepository;
    private final UtilityBillMapper mapper;
    private final CurrentUserService currentUserService;
    private final SystemConfigService systemConfigService;

    public UtilityBillService(UtilityBillRepository billRepository,
                              HouseholdRepository householdRepository,
                              UtilityBillMapper mapper,
                              CurrentUserService currentUserService,
                              SystemConfigService systemConfigService) {
        this.billRepository = billRepository;
        this.householdRepository = householdRepository;
        this.mapper = mapper;
        this.currentUserService = currentUserService;
        this.systemConfigService = systemConfigService;
    }

    // F7.1 - Nhập hoá đơn.
    @LogAdminAction(entity = "UtilityBill", action = "CREATE", description = "Nhập hoá đơn điện/nước/internet",
            detail = "'Hộ ' + #result.householdCode() + ' - ' + #result.type() + ' tháng ' + #result.month() + '/' + #result.year()")
    @Transactional
    public UtilityBillDTO create(CreateUtilityBillRequest req) {
        Household household = householdRepository.findById(req.householdId())
                .orElseThrow(() -> new NotFoundException(
                        "HOUSEHOLD_NOT_FOUND", "Không tìm thấy hộ id=" + req.householdId()));

        if (billRepository.existsByHouseholdIdAndTypeAndMonthAndYear(
                req.householdId(), req.type(), req.month(), req.year())) {
            throw new BadRequestException("UTILITY_BILL_DUPLICATE",
                    "Hộ đã có hoá đơn " + req.type() + " tháng " + req.month() + "/" + req.year());
        }

        UtilityBill b = new UtilityBill();
        b.setHousehold(household);
        b.setType(req.type());
        b.setMonth(req.month());
        b.setYear(req.year());
        b.setOldIndex(req.oldIndex());
        b.setNewIndex(req.newIndex());
        // Điện/nước: tự tính từ chỉ số & đơn giá; internet: lấy giá gói hoặc số tiền nhập tay.
        b.setAmount(computeAmount(req.type(), req.oldIndex(), req.newIndex(), req.amount()));
        b.setStatus(UtilityBillStatus.UNPAID);
        billRepository.save(b);

        return mapper.toDto(b);
    }

    /**
     * Tính số tiền hoá đơn sinh hoạt.
     * - ĐIỆN/NƯỚC: amount = (newIndex - oldIndex) * đơn giá (SystemConfig).
     * - INTERNET: dùng số tiền nhập tay nếu có, ngược lại lấy giá gói trong SystemConfig.
     */
    private BigDecimal computeAmount(UtilityType type, Integer oldIndex, Integer newIndex, BigDecimal amount) {
        if (type == UtilityType.ELECTRICITY || type == UtilityType.WATER) {
            if (oldIndex == null || newIndex == null) {
                throw new BadRequestException("UTILITY_INDEX_REQUIRED",
                        "Hoá đơn điện/nước cần nhập chỉ số cũ và chỉ số mới");
            }
            if (newIndex < oldIndex) {
                throw new BadRequestException("UTILITY_INDEX_INVALID",
                        "Chỉ số mới phải lớn hơn hoặc bằng chỉ số cũ");
            }
            String key = type == UtilityType.ELECTRICITY
                    ? SystemConfig.ELECTRICITY_UNIT_PRICE
                    : SystemConfig.WATER_UNIT_PRICE;
            BigDecimal unitPrice = systemConfigService.getValue(key);
            return unitPrice.multiply(BigDecimal.valueOf((long) newIndex - oldIndex));
        }

        // INTERNET
        if (amount != null) {
            return amount;
        }
        return systemConfigService.getValue(SystemConfig.INTERNET_PRICE);
    }

    // F7.2 - Sửa hoá đơn (chỉ khi UNPAID).
    @LogAdminAction(entity = "UtilityBill", action = "UPDATE", description = "Cập nhật hoá đơn điện/nước/internet",
            detail = "'Hộ ' + #result.householdCode() + ' - ' + #result.type() + ' tháng ' + #result.month() + '/' + #result.year()")
    @Transactional
    public UtilityBillDTO update(Long id, UpdateUtilityBillRequest req) {
        UtilityBill b = requireBill(id);
        requireUnpaid(b, "sửa");

        UtilityType newType = req.type() != null ? req.type() : b.getType();
        Integer newMonth = req.month() != null ? req.month() : b.getMonth();
        Integer newYear = req.year() != null ? req.year() : b.getYear();

        boolean keyChanged = newType != b.getType()
                || !newMonth.equals(b.getMonth())
                || !newYear.equals(b.getYear());
        if (keyChanged && billRepository.existsByHouseholdIdAndTypeAndMonthAndYear(
                b.getHousehold().getId(), newType, newMonth, newYear)) {
            throw new BadRequestException("UTILITY_BILL_DUPLICATE",
                    "Hộ đã có hoá đơn " + newType + " tháng " + newMonth + "/" + newYear);
        }

        b.setType(newType);
        b.setMonth(newMonth);
        b.setYear(newYear);

        // Chỉ số cũ/mới: null = giữ nguyên.
        Integer newOldIndex = req.oldIndex() != null ? req.oldIndex() : b.getOldIndex();
        Integer newNewIndex = req.newIndex() != null ? req.newIndex() : b.getNewIndex();
        b.setOldIndex(newOldIndex);
        b.setNewIndex(newNewIndex);

        // Điện/nước: tính lại từ chỉ số & đơn giá hiện hành.
        // Internet: dùng số tiền nhập tay nếu có, ngược lại giữ nguyên số tiền cũ.
        if (newType == UtilityType.ELECTRICITY || newType == UtilityType.WATER) {
            b.setAmount(computeAmount(newType, newOldIndex, newNewIndex, null));
        } else if (req.amount() != null) {
            b.setAmount(req.amount());
        }
        billRepository.save(b);

        return mapper.toDto(b);
    }

    // F7.2 - Xoá hoá đơn (chỉ khi UNPAID).
    @LogAdminAction(entity = "UtilityBill", action = "DELETE", description = "Xoá hoá đơn điện/nước/internet")
    @Transactional
    public void delete(Long id) {
        UtilityBill b = requireBill(id);
        requireUnpaid(b, "xoá");
        String householdCode = b.getHousehold() != null ? b.getHousehold().getCode() : "?";
        billRepository.delete(b);
        AuditContext.detail("Xoá hoá đơn " + b.getType() + " - hộ " + householdCode
                + " tháng " + b.getMonth() + "/" + b.getYear());
    }

    // F7.3 - Ghi nhận hộ đã nộp tiền mặt.
    @LogAdminAction(entity = "UtilityBill", action = "UPDATE", description = "Xác nhận hộ nộp tiền mặt hoá đơn",
            detail = "'Hộ ' + #result.householdCode() + ' - ' + #result.type() + ' tháng ' + #result.month() + '/' + #result.year()")
    @Transactional
    public UtilityBillDTO confirmCash(Long id) {
        UtilityBill b = requireBill(id);
        if (b.getStatus() == UtilityBillStatus.PAID) {
            throw new BadRequestException("UTILITY_BILL_ALREADY_PAID",
                    "Hoá đơn đã được thanh toán trước đó");
        }
        b.setStatus(UtilityBillStatus.PAID);
        b.setPaymentMethod(PaymentMethod.CASH);
        b.setPaidDate(LocalDate.now());
        b.setPaidAt(LocalDateTime.now());
        billRepository.save(b);

        return mapper.toDto(b);
    }

    // F7.4 - Admin tra cứu/lọc hoá đơn (có thể lọc theo hộ).
    @Transactional(readOnly = true)
    public PageResponse<UtilityBillDTO> search(Long householdId,
                                               UtilityType type,
                                               Integer month,
                                               Integer year,
                                               UtilityBillStatus status,
                                               Pageable pageable) {
        Page<UtilityBillDTO> page = billRepository
                .search(householdId, type, month, year, status, pageable)
                .map(mapper::toDto);
        return PageResponse.of(page);
    }

    // F7.4 - Cư dân tra cứu hoá đơn của hộ mình.
    @Transactional(readOnly = true)
    public PageResponse<UtilityBillDTO> listMyHousehold(UtilityType type,
                                                        Integer month,
                                                        Integer year,
                                                        UtilityBillStatus status,
                                                        Pageable pageable) {
        Household h = currentUserService.getCurrentUser().getHousehold();
        if (h == null) {
            throw new BadRequestException("RESIDENT_NO_HOUSEHOLD",
                    "Tài khoản chưa được gán vào hộ dân nào");
        }
        Page<UtilityBillDTO> page = billRepository
                .search(h.getId(), type, month, year, status, pageable)
                .map(mapper::toDto);
        return PageResponse.of(page);
    }

    // Admin xem chi tiết một hoá đơn.
    @Transactional(readOnly = true)
    public UtilityBillDTO getDetail(Long id) {
        return mapper.toDto(requireBill(id));
    }

    // Helpers

    private UtilityBill requireBill(Long id) {
        return billRepository.findById(id)
                .orElseThrow(() -> new NotFoundException(
                        "UTILITY_BILL_NOT_FOUND", "Không tìm thấy hoá đơn id=" + id));
    }

    private void requireUnpaid(UtilityBill b, String actionLabel) {
        if (b.getStatus() == UtilityBillStatus.PAID) {
            throw new BadRequestException("UTILITY_BILL_PAID_LOCKED",
                    "Hoá đơn đã thanh toán, không thể " + actionLabel);
        }
    }
}
