package org.example.backend.service;

import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.example.backend.aspect.AuditContext;
import org.example.backend.aspect.LogAdminAction;
import org.example.backend.dto.response.PageResponse;
import org.example.backend.dto.UtilityBillDTO;
import org.example.backend.dto.UtilityBillImportResultDTO;
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
import org.springframework.web.multipart.MultipartFile;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

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

    // ====================== NHẬP HÀNG LOẠT TỪ EXCEL ======================

    /** Cột file Excel nhập hoá đơn (khớp với template tải về). */
    private static final String[] IMPORT_HEADERS = {
            "Mã hộ", "Loại (DIEN/NUOC/INTERNET)", "Tháng", "Năm", "Chỉ số cũ", "Chỉ số mới", "Số tiền (Internet)"
    };

    /**
     * F7.1 (mở rộng) — Nhập hoá đơn cho NHIỀU hộ cùng lúc từ file Excel.
     * Mỗi dòng là một hoá đơn; dòng lỗi được bỏ qua và gom vào danh sách lỗi để admin sửa lại.
     * Chỉ những dòng hợp lệ mới được lưu (không vì 1 dòng lỗi mà huỷ cả file).
     */
    @LogAdminAction(entity = "UtilityBill", action = "CREATE", description = "Nhập hoá đơn điện/nước/internet từ Excel",
            detail = "'Đã tạo ' + #result.createdCount() + ' hoá đơn, lỗi ' + #result.failedCount() + ' dòng'")
    @Transactional
    public UtilityBillImportResultDTO importFromExcel(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new BadRequestException("UTILITY_IMPORT_EMPTY", "Chưa chọn file hoặc file rỗng");
        }
        List<String> errors = new ArrayList<>();
        int created = 0;
        DataFormatter fmt = new DataFormatter(Locale.US);

        try (InputStream in = file.getInputStream();
             Workbook wb = WorkbookFactory.create(in)) {
            Sheet sheet = wb.getSheetAt(0);
            if (sheet == null) {
                throw new BadRequestException("UTILITY_IMPORT_NO_SHEET", "File Excel không có sheet dữ liệu");
            }

            int lastRow = sheet.getLastRowNum();
            // Bỏ qua dòng tiêu đề (dòng 0).
            for (int r = 1; r <= lastRow; r++) {
                Row row = sheet.getRow(r);
                if (isRowEmpty(row, fmt)) {
                    continue;
                }
                int excelLine = r + 1; // số dòng người dùng thấy trong Excel (1-based)
                try {
                    if (importRow(row, fmt)) {
                        created++;
                    }
                } catch (BadRequestException | NotFoundException ex) {
                    errors.add("Dòng " + excelLine + ": " + ex.getMessage());
                } catch (RuntimeException ex) {
                    errors.add("Dòng " + excelLine + ": dữ liệu không hợp lệ");
                }
            }
        } catch (BadRequestException ex) {
            throw ex;
        } catch (Exception ex) {
            throw new BadRequestException("UTILITY_IMPORT_PARSE_ERROR",
                    "Không đọc được file Excel. Hãy dùng đúng mẫu (.xlsx) tải từ hệ thống.");
        }

        return new UtilityBillImportResultDTO(created, errors.size(), errors);
    }

    /** Đọc & lưu một dòng hoá đơn. Trả về true nếu tạo thành công. */
    private boolean importRow(Row row, DataFormatter fmt) {
        String code = cellString(row, 0, fmt);
        if (code.isEmpty()) {
            throw new BadRequestException("UTILITY_IMPORT_NO_CODE", "Thiếu mã hộ");
        }
        Household household = householdRepository.findByCode(code)
                .orElseThrow(() -> new NotFoundException("HOUSEHOLD_NOT_FOUND", "Không tìm thấy hộ mã '" + code + "'"));

        UtilityType type = parseType(cellString(row, 1, fmt));
        Integer month = cellInt(row, 2, fmt);
        Integer year = cellInt(row, 3, fmt);
        if (month == null || month < 1 || month > 12) {
            throw new BadRequestException("UTILITY_IMPORT_MONTH", "Tháng không hợp lệ (1-12)");
        }
        if (year == null || year < 2000) {
            throw new BadRequestException("UTILITY_IMPORT_YEAR", "Năm không hợp lệ");
        }

        if (billRepository.existsByHouseholdIdAndTypeAndMonthAndYear(household.getId(), type, month, year)) {
            throw new BadRequestException("UTILITY_BILL_DUPLICATE",
                    "Hộ đã có hoá đơn " + type + " tháng " + month + "/" + year);
        }

        Integer oldIndex = cellInt(row, 4, fmt);
        Integer newIndex = cellInt(row, 5, fmt);
        BigDecimal amount = cellDecimal(row, 6, fmt);

        UtilityBill b = new UtilityBill();
        b.setHousehold(household);
        b.setType(type);
        b.setMonth(month);
        b.setYear(year);
        b.setOldIndex(oldIndex);
        b.setNewIndex(newIndex);
        b.setAmount(computeAmount(type, oldIndex, newIndex, amount));
        b.setStatus(UtilityBillStatus.UNPAID);
        billRepository.save(b);
        return true;
    }

    /** Sinh file Excel mẫu (.xlsx) để admin điền dữ liệu nhập hàng loạt. */
    public byte[] buildImportTemplate() {
        try (Workbook wb = new XSSFWorkbook();
             ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Sheet sheet = wb.createSheet("Hoá đơn điện nước");

            CellStyle headerStyle = wb.createCellStyle();
            Font headerFont = wb.createFont();
            headerFont.setBold(true);
            headerStyle.setFont(headerFont);
            headerStyle.setFillForegroundColor(IndexedColors.GREY_25_PERCENT.getIndex());
            headerStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);

            Row header = sheet.createRow(0);
            for (int i = 0; i < IMPORT_HEADERS.length; i++) {
                Cell c = header.createCell(i);
                c.setCellValue(IMPORT_HEADERS[i]);
                c.setCellStyle(headerStyle);
            }

            // Dòng ví dụ minh hoạ cách điền (điện theo chỉ số, internet theo số tiền).
            Row ex1 = sheet.createRow(1);
            ex1.createCell(0).setCellValue("HK001");
            ex1.createCell(1).setCellValue("DIEN");
            ex1.createCell(2).setCellValue(6);
            ex1.createCell(3).setCellValue(2026);
            ex1.createCell(4).setCellValue(1200);
            ex1.createCell(5).setCellValue(1320);

            Row ex2 = sheet.createRow(2);
            ex2.createCell(0).setCellValue("HK001");
            ex2.createCell(1).setCellValue("INTERNET");
            ex2.createCell(2).setCellValue(6);
            ex2.createCell(3).setCellValue(2026);
            ex2.createCell(6).setCellValue(200000);

            for (int i = 0; i < IMPORT_HEADERS.length; i++) {
                sheet.autoSizeColumn(i);
            }

            wb.write(out);
            return out.toByteArray();
        } catch (Exception ex) {
            throw new BadRequestException("UTILITY_TEMPLATE_ERROR", "Không tạo được file mẫu");
        }
    }

    private UtilityType parseType(String raw) {
        String s = raw == null ? "" : raw.trim().toUpperCase(Locale.ROOT);
        switch (s) {
            case "ELECTRICITY":
            case "DIEN":
            case "ĐIỆN":
            case "ĐIEN":
            case "DIỆN":
                return UtilityType.ELECTRICITY;
            case "WATER":
            case "NUOC":
            case "NƯỚC":
            case "NUƠC":
                return UtilityType.WATER;
            case "INTERNET":
            case "NET":
                return UtilityType.INTERNET;
            default:
                throw new BadRequestException("UTILITY_IMPORT_TYPE",
                        "Loại hoá đơn không hợp lệ: '" + raw + "' (dùng DIEN/NUOC/INTERNET)");
        }
    }

    private boolean isRowEmpty(Row row, DataFormatter fmt) {
        if (row == null) {
            return true;
        }
        for (int i = 0; i < IMPORT_HEADERS.length; i++) {
            if (!cellString(row, i, fmt).isEmpty()) {
                return false;
            }
        }
        return true;
    }

    private String cellString(Row row, int idx, DataFormatter fmt) {
        if (row == null) {
            return "";
        }
        Cell c = row.getCell(idx);
        return c == null ? "" : fmt.formatCellValue(c).trim();
    }

    private Integer cellInt(Row row, int idx, DataFormatter fmt) {
        String s = cellString(row, idx, fmt).replace(",", "").replace(".", "").replace(" ", "");
        if (s.isEmpty()) {
            return null;
        }
        try {
            return Integer.valueOf(s);
        } catch (NumberFormatException ex) {
            throw new BadRequestException("UTILITY_IMPORT_NUMBER", "Giá trị '" + s + "' không phải số nguyên");
        }
    }

    private BigDecimal cellDecimal(Row row, int idx, DataFormatter fmt) {
        String s = cellString(row, idx, fmt).replace(",", "").replace(" ", "");
        if (s.isEmpty()) {
            return null;
        }
        try {
            return new BigDecimal(s);
        } catch (NumberFormatException ex) {
            throw new BadRequestException("UTILITY_IMPORT_NUMBER", "Số tiền '" + s + "' không hợp lệ");
        }
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
