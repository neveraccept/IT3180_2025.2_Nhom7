package org.example.backend.service;

import org.example.backend.dto.*;
import org.example.backend.entity.Fee;
import org.example.backend.entity.FeePeriod;
import org.example.backend.entity.Payment;
import org.example.backend.entity.PaymentTransaction;
import org.example.backend.entity.Resident;
import org.example.backend.entity.enums.Gender;
import org.example.backend.entity.enums.HouseholdStatus;
import org.example.backend.entity.enums.ResidencyStatus;
import org.example.backend.entity.enums.ResidentStatus;
import org.example.backend.exception.NotFoundException;
import org.example.backend.repository.*;
import org.example.backend.repository.projection.DonationContributionProjection;
import org.example.backend.repository.projection.HouseholdPaymentProjection;
import org.example.backend.service.report.ExcelReportExporter;
import org.example.backend.service.report.PdfReportExporter;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.text.DecimalFormat;
import java.text.DecimalFormatSymbols;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Nghiệp vụ Module 10 – Tra cứu, thống kê và xuất báo cáo.
 *
 * - Các method *Statistics(...) trả về DTO để Controller bọc trong ApiResponse.ok(...).
 * - Các method export*(...) trả về byte[] (Excel/PDF).
 */
@Service
public class ReportService {

    private static final DateTimeFormatter DATE_FMT =
            DateTimeFormatter.ofPattern("dd/MM/yyyy");
    private static final DateTimeFormatter DATETIME_FMT =
            DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm");

    private final ReportPaymentRepository paymentRepository;
    private final ReportFeePeriodRepository feePeriodRepository;
    private final ReportResidentRepository residentRepository;
    private final ReportHouseholdRepository householdRepository;
    private final ReportTransactionRepository transactionRepository;
    private final FeeRepository feeRepository;
    private final ExcelReportExporter excelExporter;
    private final PdfReportExporter pdfExporter;

    public ReportService(ReportPaymentRepository paymentRepository,
                         ReportFeePeriodRepository feePeriodRepository,
                         ReportResidentRepository residentRepository,
                         ReportHouseholdRepository householdRepository,
                         ReportTransactionRepository transactionRepository,
                         FeeRepository feeRepository,
                         ExcelReportExporter excelExporter,
                         PdfReportExporter pdfExporter) {
        this.paymentRepository = paymentRepository;
        this.feePeriodRepository = feePeriodRepository;
        this.residentRepository = residentRepository;
        this.householdRepository = householdRepository;
        this.transactionRepository = transactionRepository;
        this.feeRepository = feeRepository;
        this.excelExporter = excelExporter;
        this.pdfExporter = pdfExporter;
    }

    // ============================================================
    //  F10.1 – Thống kê tình trạng đợt thu
    // ============================================================

    @Transactional(readOnly = true)
    public FeePeriodStatisticsDTO getFeePeriodStatistics(Long feePeriodId) {
        return getFeePeriodStatistics(List.of(feePeriodId), null, null);
    }

    /**
     * F10.1 – Thống kê tình trạng MỘT HOẶC NHIỀU đợt thu cùng lúc, có lọc tuỳ chọn theo
     * khoảng ngày thanh toán [from, to] (null = không giới hạn).
     * Tổng số hộ phải nộp & tổng phải thu cộng dồn trên toàn bộ đợt được chọn; số hộ đã nộp
     * và tiền đã thu chỉ tính các phiếu có ngày thanh toán nằm trong khoảng.
     */
    @Transactional(readOnly = true)
    public FeePeriodStatisticsDTO getFeePeriodStatistics(List<Long> feePeriodIds, LocalDate from, LocalDate to) {
        List<FeePeriod> periods = requireFeePeriods(feePeriodIds);

        long total = paymentRepository.countByFeePeriodIdIn(feePeriodIds);
        long paid = paymentRepository.countPaidByFeePeriodInRange(feePeriodIds, from, to);
        long unpaid = total - paid;
        BigDecimal due = nz(paymentRepository.sumAmountDueByFeePeriodIn(feePeriodIds));
        BigDecimal collected = nz(paymentRepository.sumAmountPaidByFeePeriodInRange(feePeriodIds, from, to));
        BigDecimal outstanding = due.subtract(collected);
        double rate = total == 0 ? 0d
                : BigDecimal.valueOf(paid)
                .divide(BigDecimal.valueOf(total), 4, RoundingMode.HALF_UP)
                .multiply(BigDecimal.valueOf(100))
                .doubleValue();

        // Gộp nhãn khi chọn nhiều đợt: tên đợt nối bằng dấu phẩy; khoản thu/trạng thái
        // gộp distinct để vẫn đọc được khi các đợt cùng khoản hoặc cùng trạng thái.
        String periodNames = periods.stream()
                .map(FeePeriod::getName)
                .collect(Collectors.joining(", "));
        Set<String> feeNames = periods.stream()
                .map(p -> p.getFee() != null ? p.getFee().getName() : null)
                .filter(n -> n != null)
                .collect(Collectors.toCollection(LinkedHashSet::new));
        Set<String> feeTypes = periods.stream()
                .map(p -> p.getFee() != null ? p.getFee().getType() : null)
                .filter(n -> n != null)
                .collect(Collectors.toCollection(LinkedHashSet::new));
        Set<String> statuses = periods.stream()
                .map(FeePeriod::getStatus)
                .filter(n -> n != null)
                .collect(Collectors.toCollection(LinkedHashSet::new));

        return new FeePeriodStatisticsDTO(
                periods.size() == 1 ? periods.get(0).getId() : null,
                periodNames,
                String.join(", ", feeNames),
                feeTypes.size() == 1 ? feeTypes.iterator().next() : String.join(", ", feeTypes),
                statuses.size() == 1 ? statuses.iterator().next() : String.join(", ", statuses),
                total, paid, unpaid,
                due, collected, outstanding, rate);
    }

    // ============================================================
    //  F10.2 – Thống kê khoản đóng góp tự nguyện theo KHOẢN THU (Fee type=DONATION)
    // ============================================================

    @Transactional(readOnly = true)
    public DonationStatisticsDTO getDonationStatistics(Long feeId) {
        Fee fee = requireDonationFee(feeId);
        List<DonationContributionProjection> raw = paymentRepository.findContributionsByFee(feeId);

        List<DonationContributionDTO> items = new ArrayList<>();
        BigDecimal total = BigDecimal.ZERO;
        for (DonationContributionProjection p : raw) {
            BigDecimal amount = nz(p.getAmount());
            total = total.add(amount);
            items.add(new DonationContributionDTO(
                    p.getHouseholdCode(),
                    p.getHeadName(),
                    p.getApartmentCode(),
                    amount,
                    p.getPaidDate()));
        }

        return new DonationStatisticsDTO(
                fee.getId(),
                fee.getName(),
                items.size(),
                total,
                items);
    }

    // ============================================================
    //  F10.3 – Thống kê theo hộ gia đình
    // ============================================================

    @Transactional(readOnly = true)
    public List<HouseholdPaymentSummaryDTO> getHouseholdStatistics() {
        return getHouseholdStatistics(null, null);
    }

    /** F10.3 có lọc theo khoảng ngày thanh toán [from, to] (null = không giới hạn). */
    @Transactional(readOnly = true)
    public List<HouseholdPaymentSummaryDTO> getHouseholdStatistics(LocalDate from, LocalDate to) {
        List<HouseholdPaymentProjection> raw = paymentRepository.aggregateByHouseholdInRange(from, to);
        List<HouseholdPaymentSummaryDTO> result = new ArrayList<>();
        for (HouseholdPaymentProjection p : raw) {
            BigDecimal due = nz(p.getTotalDue());
            BigDecimal paid = nz(p.getTotalPaid());
            result.add(new HouseholdPaymentSummaryDTO(
                    p.getHouseholdId(),
                    p.getHouseholdCode(),
                    p.getHeadName(),
                    p.getApartmentCode(),
                    due,
                    paid,
                    due.subtract(paid),
                    p.getUnpaidCount() == null ? 0 : p.getUnpaidCount(),
                    p.getPaymentCount() == null ? 0 : p.getPaymentCount()));
        }
        return result;
    }

    // ============================================================
    //  F10.4 – Thống kê dân cư
    // ============================================================

    @Transactional(readOnly = true)
    public ResidentStatisticsDTO getResidentStatistics() {
        return getResidentStatistics(null, null);
    }

    /**
     * F10.4 có lọc theo khoảng ngày [from, to] (null = không giới hạn).
     * Mốc thời gian dùng ngày chuyển vào của hộ (household.moveInDate).
     */
    @Transactional(readOnly = true)
    public ResidentStatisticsDTO getResidentStatistics(LocalDate from, LocalDate to) {
        long activeHouseholds = householdRepository.countByStatusInRange(HouseholdStatus.ACTIVE, from, to);
        long activeResidents = residentRepository.countByStatusInRange(ResidentStatus.ACTIVE, from, to);
        long permanent = residentRepository.countByStatusAndResidencyStatusInRange(
                ResidentStatus.ACTIVE, ResidencyStatus.PERMANENT, from, to);
        long temporary = residentRepository.countByStatusAndResidencyStatusInRange(
                ResidentStatus.ACTIVE, ResidencyStatus.TEMPORARY, from, to);
        long absent = residentRepository.countByStatusAndResidencyStatusInRange(
                ResidentStatus.ACTIVE, ResidencyStatus.ABSENT, from, to);
        long male = residentRepository.countByStatusAndGenderInRange(ResidentStatus.ACTIVE, Gender.MALE, from, to);
        long female = residentRepository.countByStatusAndGenderInRange(ResidentStatus.ACTIVE, Gender.FEMALE, from, to);
        long other = residentRepository.countByStatusAndGenderInRange(ResidentStatus.ACTIVE, Gender.OTHER, from, to);

        return new ResidentStatisticsDTO(
                activeHouseholds, activeResidents,
                permanent, temporary, absent,
                male, female, other);
    }

    // ============================================================
    //  F10.5 / F10.6 – Xuất báo cáo Excel / PDF
    // ============================================================

    @Transactional
    public byte[] exportFeePeriodExcel(List<Long> feePeriodIds) {
        FeePeriodStatisticsDTO s = getFeePeriodStatistics(feePeriodIds, null, null);
        ReportData data = buildFeePeriodReport(s);
        byte[] file = excelExporter.export("Tinh trang dot thu", data.title, data.meta, data.headers, data.rows);
        return file;
    }

    @Transactional
    public byte[] exportFeePeriodPdf(List<Long> feePeriodIds) {
        FeePeriodStatisticsDTO s = getFeePeriodStatistics(feePeriodIds, null, null);
        ReportData data = buildFeePeriodReport(s);
        byte[] file = pdfExporter.export(data.title, data.meta, data.headers, data.rows);
        return file;
    }

    @Transactional
    public byte[] exportDonationExcel(Long feeId) {
        DonationStatisticsDTO s = getDonationStatistics(feeId);
        ReportData data = buildDonationReport(s);
        byte[] file = excelExporter.export("Bao cao dong gop", data.title, data.meta, data.headers, data.rows);
        return file;
    }

    @Transactional
    public byte[] exportDonationPdf(Long feeId) {
        DonationStatisticsDTO s = getDonationStatistics(feeId);
        ReportData data = buildDonationReport(s);
        byte[] file = pdfExporter.export(data.title, data.meta, data.headers, data.rows);
        return file;
    }

    @Transactional
    public byte[] exportHouseholdExcel() {
        ReportData data = buildHouseholdReport(getHouseholdStatistics());
        byte[] file = excelExporter.export("Thong ke theo ho", data.title, data.meta, data.headers, data.rows);
        return file;
    }

    @Transactional
    public byte[] exportHouseholdPdf() {
        ReportData data = buildHouseholdReport(getHouseholdStatistics());
        byte[] file = pdfExporter.export(data.title, data.meta, data.headers, data.rows);
        return file;
    }

    @Transactional
    public byte[] exportResidentExcel() {
        // Excel xuất CHI TIẾT danh sách nhân khẩu đang cư trú (theo yêu cầu nghiệp vụ),
        // thay vì các con số tổng hợp như màn hình xem trước.
        List<Resident> residents = residentRepository
                .findDetailedByStatusInRange(ResidentStatus.ACTIVE, null, null);
        ReportData data = buildResidentDetailReport(residents);
        byte[] file = excelExporter.export("Thong ke dan cu", data.title, data.meta, data.headers, data.rows);
        return file;
    }

    @Transactional
    public byte[] exportResidentPdf() {
        ReportData data = buildResidentReport(getResidentStatistics());
        byte[] file = pdfExporter.export(data.title, data.meta, data.headers, data.rows);
        return file;
    }

    @Transactional
    public byte[] exportTransactionExcel(String status, LocalDateTime from, LocalDateTime to) {
        ReportData data = buildTransactionReport(status, from, to);
        byte[] file = excelExporter.export("Giao dich online", data.title, data.meta, data.headers, data.rows);
        return file;
    }

    @Transactional
    public byte[] exportTransactionPdf(String status, LocalDateTime from, LocalDateTime to) {
        ReportData data = buildTransactionReport(status, from, to);
        byte[] file = pdfExporter.export(data.title, data.meta, data.headers, data.rows);
        return file;
    }

    // ============================================================
    //  Dựng dữ liệu bảng cho từng loại báo cáo
    // ============================================================

    private ReportData buildFeePeriodReport(FeePeriodStatisticsDTO s) {
        ReportData d = new ReportData();
        d.title = "BÁO CÁO TÌNH TRẠNG ĐỢT THU";
        d.meta = List.of(
                "Đợt thu: " + safe(s.feePeriodName()),
                "Khoản thu: " + safe(s.feeName()),
                "Trạng thái đợt: " + safe(s.periodStatus()),
                "Ngày xuất: " + LocalDateTime.now().format(DATETIME_FMT));
        d.headers = List.of("Chỉ tiêu", "Giá trị");
        d.rows = List.of(
                List.of("Tổng số hộ phải nộp", String.valueOf(s.totalHouseholds())),
                List.of("Số hộ đã nộp", String.valueOf(s.paidCount())),
                List.of("Số hộ chưa nộp", String.valueOf(s.unpaidCount())),
                List.of("Tổng tiền phải thu (đ)", money(s.totalDue())),
                List.of("Tổng tiền đã thu (đ)", money(s.totalCollected())),
                List.of("Còn phải thu (đ)", money(s.totalOutstanding())),
                List.of("Tỉ lệ đã nộp (%)", percent(s.collectionRate())));
        return d;
    }

    private ReportData buildDonationReport(DonationStatisticsDTO s) {
        ReportData d = new ReportData();
        d.title = "BÁO CÁO KHOẢN ĐÓNG GÓP";
        d.meta = List.of(
                "Khoản đóng góp: " + safe(s.feeName()),
                "Số hộ đóng góp: " + s.contributorCount(),
                "Tổng số tiền đóng góp (đ): " + money(s.totalAmount()),
                "Ngày xuất: " + LocalDateTime.now().format(DATETIME_FMT));
        d.headers = List.of("STT", "Mã hộ", "Chủ hộ", "Căn hộ", "Số tiền (đ)", "Ngày đóng");
        List<List<String>> rows = new ArrayList<>();
        int i = 1;
        for (DonationContributionDTO c : s.contributions()) {
            rows.add(List.of(
                    String.valueOf(i++),
                    safe(c.householdCode()),
                    safe(c.headName()),
                    safe(c.apartmentCode()),
                    money(c.amount()),
                    c.paidDate() == null ? "" : c.paidDate().format(DATE_FMT)));
        }
        d.rows = rows;
        return d;
    }

    private ReportData buildHouseholdReport(List<HouseholdPaymentSummaryDTO> list) {
        ReportData d = new ReportData();
        d.title = "BÁO CÁO THỐNG KÊ THEO HỘ GIA ĐÌNH";
        d.meta = List.of(
                "Tổng số hộ: " + list.size(),
                "Ngày xuất: " + LocalDateTime.now().format(DATETIME_FMT));
        d.headers = List.of("STT", "Mã hộ", "Chủ hộ", "Căn hộ",
                "Tổng phải nộp (đ)", "Đã nộp (đ)", "Còn nợ (đ)", "Số phiếu chưa nộp");
        List<List<String>> rows = new ArrayList<>();
        int i = 1;
        for (HouseholdPaymentSummaryDTO h : list) {
            rows.add(List.of(
                    String.valueOf(i++),
                    safe(h.householdCode()),
                    safe(h.headName()),
                    safe(h.apartmentCode()),
                    money(h.totalDue()),
                    money(h.totalPaid()),
                    money(h.outstanding()),
                    String.valueOf(h.unpaidCount())));
        }
        d.rows = rows;
        return d;
    }

    private ReportData buildResidentReport(ResidentStatisticsDTO s) {
        ReportData d = new ReportData();
        d.title = "BÁO CÁO THỐNG KÊ DÂN CƯ";
        d.meta = List.of("Ngày xuất: " + LocalDateTime.now().format(DATETIME_FMT));
        d.headers = List.of("Chỉ tiêu", "Số lượng");
        d.rows = List.of(
                List.of("Tổng số hộ (ACTIVE)", String.valueOf(s.totalActiveHouseholds())),
                List.of("Tổng số nhân khẩu (ACTIVE)", String.valueOf(s.totalActiveResidents())),
                List.of("Thường trú", String.valueOf(s.permanentCount())),
                List.of("Tạm trú", String.valueOf(s.temporaryCount())),
                List.of("Tạm vắng", String.valueOf(s.absentCount())),
                List.of("Nam", String.valueOf(s.maleCount())),
                List.of("Nữ", String.valueOf(s.femaleCount())),
                List.of("Khác", String.valueOf(s.otherCount())));
        return d;
    }

    /** Bảng CHI TIẾT danh sách nhân khẩu đang cư trú phục vụ xuất Excel thống kê dân cư. */
    private ReportData buildResidentDetailReport(List<Resident> residents) {
        ReportData d = new ReportData();
        d.title = "BÁO CÁO THỐNG KÊ DÂN CƯ (CHI TIẾT)";
        d.meta = List.of(
                "Tổng số nhân khẩu đang cư trú: " + residents.size(),
                "Ngày xuất: " + LocalDateTime.now().format(DATETIME_FMT));
        d.headers = List.of("STT", "Họ tên", "CCCD/CMND", "Ngày sinh", "Giới tính",
                "Căn hộ", "Quan hệ với chủ hộ", "Tình trạng cư trú");
        List<List<String>> rows = new ArrayList<>();
        int i = 1;
        for (Resident r : residents) {
            String apartmentCode = r.getHousehold() != null && r.getHousehold().getApartment() != null
                    ? safe(r.getHousehold().getApartment().getCode())
                    : "";
            rows.add(List.of(
                    String.valueOf(i++),
                    safe(r.getFullName()),
                    safe(r.getIdCard()),
                    r.getDateOfBirth() == null ? "" : r.getDateOfBirth().format(DATE_FMT),
                    genderLabel(r.getGender()),
                    apartmentCode,
                    safe(r.getRelationToHead()),
                    residencyLabel(r.getResidencyStatus())));
        }
        d.rows = rows;
        return d;
    }

    private ReportData buildTransactionReport(String status, LocalDateTime from, LocalDateTime to) {
        List<PaymentTransaction> txs = transactionRepository.findForReport(status, from, to);
        ReportData d = new ReportData();
        d.title = "BÁO CÁO GIAO DỊCH THANH TOÁN ONLINE";
        d.meta = List.of(
                "Bộ lọc trạng thái: " + (status == null ? "Tất cả" : status),
                "Số giao dịch: " + txs.size(),
                "Ngày xuất: " + LocalDateTime.now().format(DATETIME_FMT));
        d.headers = List.of("STT", "Mã giao dịch", "Hộ", "Người TT", "Loại",
                "Số tiền (đ)", "Trạng thái", "Mã VNPay", "Tạo lúc");
        List<List<String>> rows = new ArrayList<>();
        int i = 1;
        for (PaymentTransaction t : txs) {
            rows.add(List.of(
                    String.valueOf(i++),
                    safe(t.getTransactionCode()),
                    t.getHousehold() != null ? safe(t.getHousehold().getCode()) : "",
                    t.getUser() != null ? safe(t.getUser().getFullName()) : "",
                    safe(t.getTargetType()),
                    money(t.getAmount()),
                    safe(t.getStatus()),
                    safe(t.getVnpayTransactionNo()),
                    t.getCreatedAt() == null ? "" : t.getCreatedAt().format(DATETIME_FMT)));
        }
        d.rows = rows;
        return d;
    }

    // ============================================================
    //  Helpers
    // ============================================================

    private FeePeriod requireFeePeriod(Long id) {
        return feePeriodRepository.findById(id)
                .orElseThrow(() -> new NotFoundException(
                        "FEE_PERIOD_NOT_FOUND",
                        "Không tìm thấy đợt thu id=" + id));
    }

    /** Nạp & xác thực danh sách đợt thu được chọn (giữ thứ tự id truyền vào). */
    private List<FeePeriod> requireFeePeriods(List<Long> ids) {
        if (ids == null || ids.isEmpty()) {
            throw new NotFoundException("FEE_PERIOD_NOT_FOUND", "Chưa chọn đợt thu nào");
        }
        List<FeePeriod> periods = feePeriodRepository.findAllById(ids);
        if (periods.isEmpty()) {
            throw new NotFoundException("FEE_PERIOD_NOT_FOUND",
                    "Không tìm thấy đợt thu với id=" + ids);
        }
        return periods;
    }

    /** Nạp & xác thực một khoản thu tự nguyện (Fee type=DONATION). */
    private Fee requireDonationFee(Long feeId) {
        Fee fee = feeRepository.findById(feeId)
                .orElseThrow(() -> new NotFoundException(
                        "FEE_NOT_FOUND", "Không tìm thấy khoản thu id=" + feeId));
        if (!"DONATION".equals(fee.getType())) {
            throw new NotFoundException("FEE_NOT_DONATION",
                    "Khoản thu id=" + feeId + " không phải khoản đóng góp tự nguyện");
        }
        return fee;
    }

    private static String genderLabel(Gender g) {
        if (g == null) return "";
        return switch (g) {
            case MALE -> "Nam";
            case FEMALE -> "Nữ";
            case OTHER -> "Khác";
        };
    }

    private static String residencyLabel(ResidencyStatus s) {
        if (s == null) return "";
        return switch (s) {
            case PERMANENT -> "Thường trú";
            case TEMPORARY -> "Tạm trú";
            case ABSENT -> "Tạm vắng";
        };
    }

    private static BigDecimal nz(BigDecimal v) {
        return v == null ? BigDecimal.ZERO : v;
    }

    private static String safe(String s) {
        return s == null ? "" : s;
    }

    private static String money(BigDecimal v) {
        DecimalFormatSymbols symbols = new DecimalFormatSymbols(Locale.US);
        symbols.setGroupingSeparator('.');
        DecimalFormat df = new DecimalFormat("#,##0", symbols);
        return df.format(nz(v));
    }

    private static String percent(double v) {
        return new DecimalFormat("0.0").format(v);
    }

    /** Cấu trúc bảng trung gian để truyền sang exporter. */
    private static final class ReportData {
        String title;
        List<String> meta;
        List<String> headers;
        List<List<String>> rows;
    }
}
