package org.example.backend.service;

import org.example.backend.dto.response.PageResponse;
import org.example.backend.dto.UtilityBillDTO;
import org.example.backend.dto.request.CreateUtilityBillRequest;
import org.example.backend.dto.request.UpdateUtilityBillRequest;
import org.example.backend.entity.Household;
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

import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * M7 â€“ Quáº£n lÃ½ hoÃ¡ Ä‘Æ¡n Ä‘iá»‡n/nÆ°á»›c/internet.
 *  F7.1 nháº­p hoÃ¡ Ä‘Æ¡n, F7.2 sá»­a/xoÃ¡, F7.3 ghi nháº­n Ä‘Ã£ ná»™p tiá»n máº·t, F7.4 tra cá»©u theo há»™.
 *
 * Quy Æ°á»›c: chá»‰ thao tÃ¡c trÃªn hoÃ¡ Ä‘Æ¡n cÃ²n UNPAID khi sá»­a/xoÃ¡ Ä‘á»ƒ giá»¯ tÃ­nh toÃ n váº¹n Ä‘á»‘i soÃ¡t.
 * HoÃ¡ Ä‘Æ¡n Ä‘Ã£ PAID (tiá»n máº·t hoáº·c online qua VNPay) khÃ´ng Ä‘Æ°á»£c sá»­a/xoÃ¡.
 */
@Service
public class UtilityBillService {

    private final UtilityBillRepository billRepository;
    private final HouseholdRepository householdRepository;
    private final UtilityBillMapper mapper;
    private final CurrentUserService currentUserService;

    public UtilityBillService(UtilityBillRepository billRepository,
                              HouseholdRepository householdRepository,
                              UtilityBillMapper mapper,
                              CurrentUserService currentUserService) {
        this.billRepository = billRepository;
        this.householdRepository = householdRepository;
        this.mapper = mapper;
        this.currentUserService = currentUserService;
    }

    // F7.1 â€“ Nháº­p hoÃ¡ Ä‘Æ¡n.
    @Transactional
    public UtilityBillDTO create(CreateUtilityBillRequest req) {
        Household household = householdRepository.findById(req.householdId())
                .orElseThrow(() -> new NotFoundException(
                        "HOUSEHOLD_NOT_FOUND", "KhÃ´ng tÃ¬m tháº¥y há»™ id=" + req.householdId()));

        if (billRepository.existsByHouseholdIdAndTypeAndMonthAndYear(
                req.householdId(), req.type(), req.month(), req.year())) {
            throw new BadRequestException("UTILITY_BILL_DUPLICATE",
                    "Há»™ Ä‘Ã£ cÃ³ hoÃ¡ Ä‘Æ¡n " + req.type() + " thÃ¡ng " + req.month() + "/" + req.year());
        }

        UtilityBill b = new UtilityBill();
        b.setHousehold(household);
        b.setType(req.type());
        b.setMonth(req.month());
        b.setYear(req.year());
        b.setAmount(req.amount());
        b.setStatus(UtilityBillStatus.UNPAID);
        billRepository.save(b);

        return mapper.toDto(b);
    }

    // F7.2 â€“ Sá»­a hoÃ¡ Ä‘Æ¡n (chá»‰ khi UNPAID).
    @Transactional
    public UtilityBillDTO update(Long id, UpdateUtilityBillRequest req) {
        UtilityBill b = requireBill(id);
        requireUnpaid(b, "sá»­a");

        UtilityType newType = req.type() != null ? req.type() : b.getType();
        Integer newMonth = req.month() != null ? req.month() : b.getMonth();
        Integer newYear = req.year() != null ? req.year() : b.getYear();

        boolean keyChanged = newType != b.getType()
                || !newMonth.equals(b.getMonth())
                || !newYear.equals(b.getYear());
        if (keyChanged && billRepository.existsByHouseholdIdAndTypeAndMonthAndYear(
                b.getHousehold().getId(), newType, newMonth, newYear)) {
            throw new BadRequestException("UTILITY_BILL_DUPLICATE",
                    "Há»™ Ä‘Ã£ cÃ³ hoÃ¡ Ä‘Æ¡n " + newType + " thÃ¡ng " + newMonth + "/" + newYear);
        }

        b.setType(newType);
        b.setMonth(newMonth);
        b.setYear(newYear);
        if (req.amount() != null) b.setAmount(req.amount());
        billRepository.save(b);

        return mapper.toDto(b);
    }

    // F7.2 â€“ XoÃ¡ hoÃ¡ Ä‘Æ¡n (chá»‰ khi UNPAID).
    @Transactional
    public void delete(Long id) {
        UtilityBill b = requireBill(id);
        requireUnpaid(b, "xoÃ¡");
        billRepository.delete(b);

    }

    // F7.3 â€“ Ghi nháº­n há»™ Ä‘Ã£ ná»™p tiá»n máº·t.
    @Transactional
    public UtilityBillDTO confirmCash(Long id) {
        UtilityBill b = requireBill(id);
        if (b.getStatus() == UtilityBillStatus.PAID) {
            throw new BadRequestException("UTILITY_BILL_ALREADY_PAID",
                    "HoÃ¡ Ä‘Æ¡n Ä‘Ã£ Ä‘Æ°á»£c thanh toÃ¡n trÆ°á»›c Ä‘Ã³");
        }
        b.setStatus(UtilityBillStatus.PAID);
        b.setPaymentMethod(PaymentMethod.CASH);
        b.setPaidDate(LocalDate.now());
        b.setPaidAt(LocalDateTime.now());
        billRepository.save(b);

        return mapper.toDto(b);
    }

    // F7.4 â€“ Admin tra cá»©u/lá»c hoÃ¡ Ä‘Æ¡n (cÃ³ thá»ƒ lá»c theo há»™).
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

    // F7.4 â€“ CÆ° dÃ¢n tra cá»©u hoÃ¡ Ä‘Æ¡n cá»§a há»™ mÃ¬nh.
    @Transactional(readOnly = true)
    public PageResponse<UtilityBillDTO> listMyHousehold(UtilityType type,
                                                        Integer month,
                                                        Integer year,
                                                        UtilityBillStatus status,
                                                        Pageable pageable) {
        Household h = currentUserService.getCurrentUser().getHousehold();
        if (h == null) {
            throw new BadRequestException("RESIDENT_NO_HOUSEHOLD",
                    "TÃ i khoáº£n chÆ°a Ä‘Æ°á»£c gÃ¡n vÃ o há»™ dÃ¢n nÃ o");
        }
        Page<UtilityBillDTO> page = billRepository
                .search(h.getId(), type, month, year, status, pageable)
                .map(mapper::toDto);
        return PageResponse.of(page);
    }

    // Admin xem chi tiáº¿t má»™t hoÃ¡ Ä‘Æ¡n.
    @Transactional(readOnly = true)
    public UtilityBillDTO getDetail(Long id) {
        return mapper.toDto(requireBill(id));
    }

    // Helpers

    private UtilityBill requireBill(Long id) {
        return billRepository.findById(id)
                .orElseThrow(() -> new NotFoundException(
                        "UTILITY_BILL_NOT_FOUND", "KhÃ´ng tÃ¬m tháº¥y hoÃ¡ Ä‘Æ¡n id=" + id));
    }

    private void requireUnpaid(UtilityBill b, String actionLabel) {
        if (b.getStatus() == UtilityBillStatus.PAID) {
            throw new BadRequestException("UTILITY_BILL_PAID_LOCKED",
                    "HoÃ¡ Ä‘Æ¡n Ä‘Ã£ thanh toÃ¡n, khÃ´ng thá»ƒ " + actionLabel);
        }
    }
}
