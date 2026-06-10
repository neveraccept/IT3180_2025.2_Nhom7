package org.example.backend.config;

import net.datafaker.Faker;
import org.example.backend.entity.*;
import org.example.backend.entity.enums.*;
import org.example.backend.repository.*;
import org.springframework.core.annotation.Order;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.*;


// Sinh toàn bộ dữ liệu mẫu (seed data) cho hệ thống quản lý chung cư khi khởi động.
// Hạ tầng -> Cư dân/Hộ -> Phương tiện/Gửi xe -> Tài chính -> Tương tác.
//
// LƯU Ý (theo yêu cầu): KHÔNG seed hóa đơn điện/nước/internet trực tiếp vào DB.
// Thay vào đó dữ liệu điện/nước/internet được cung cấp dưới dạng file Excel mẫu
// (Backend/sample-data/hoa-don-dien-nuoc.xlsx) để Admin tự nhập qua chức năng
// "Nhập hóa đơn hàng loạt" (POST /api/utility-bills/import).
// Các hộ được chọn NGẪU NHIÊN trong số các căn ở. File Excel mẫu liệt kê tất cả mã hộ
// có thể có; khi import, dòng nào trỏ tới hộ chưa tồn tại sẽ tự động bị bỏ qua.

@Component
@Order(2)
public class InitialDataConfig implements CommandLineRunner {

    // Thông số cơ bản
    private static final int TYPICAL_FLOOR_START = 6;
    private static final int TYPICAL_FLOOR_END = 29;
    private static final int PENTHOUSE_FLOOR = 30;

    // Diện tích 4 ki-ốt tầng 1 (m²): tổng 310, phần còn lại là sảnh chung.
    private static final int[] KIOSK_AREAS = {100, 80, 65, 65};
    // Diện tích 6 căn mỗi tầng: tổng 380.
    private static final int[] TYPICAL_AREAS = {85, 85, 60, 60, 45, 45};
    private static final int PENTHOUSE_AREA = 380;

    private static final int CAR_SLOTS_PER_FLOOR = 30;
    private static final int MOTORBIKE_SLOTS_PER_FLOOR = 100;

    private static final int TARGET_HOUSEHOLDS = 100;
    private static final int TARGET_COMPLAINTS = 10;

    private static final String RESIDENT_PASSWORD = "user123";

    //  Dependencies
    private final ApartmentRepository apartmentRepository;
    private final ParkingSlotRepository parkingSlotRepository;
    private final HouseholdRepository householdRepository;
    private final ResidentRepository residentRepository;
    private final VehicleRepository vehicleRepository;
    private final ParkingRegistrationRepository parkingRegistrationRepository;
    private final FeeRepository feeRepository;
    private final FeePeriodRepository feePeriodRepository;
    private final SystemConfigRepository systemConfigRepository;
    private final ComplaintRepository complaintRepository;
    private final NotificationRepository notificationRepository;
    private final NotificationRecipientRepository notificationRecipientRepository;
    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final PasswordEncoder passwordEncoder;
    private final org.example.backend.service.FeePeriodService feePeriodService;

    private final Faker faker = new Faker(Locale.of("vi"));
    private final Random random = new Random();

    /** Bộ đếm toàn cục đảm bảo biển số xe (UNIQUE) không trùng. */
    private int plateSequence = 0;

    public InitialDataConfig(ApartmentRepository apartmentRepository,
                             ParkingSlotRepository parkingSlotRepository,
                             HouseholdRepository householdRepository,
                             ResidentRepository residentRepository,
                             VehicleRepository vehicleRepository,
                             ParkingRegistrationRepository parkingRegistrationRepository,
                             FeeRepository feeRepository,
                             FeePeriodRepository feePeriodRepository,
                             SystemConfigRepository systemConfigRepository,
                             ComplaintRepository complaintRepository,
                             NotificationRepository notificationRepository,
                             NotificationRecipientRepository notificationRecipientRepository,
                             UserRepository userRepository,
                             RoleRepository roleRepository,
                             PasswordEncoder passwordEncoder,
                             org.example.backend.service.FeePeriodService feePeriodService) {
        this.apartmentRepository = apartmentRepository;
        this.parkingSlotRepository = parkingSlotRepository;
        this.householdRepository = householdRepository;
        this.residentRepository = residentRepository;
        this.vehicleRepository = vehicleRepository;
        this.parkingRegistrationRepository = parkingRegistrationRepository;
        this.feeRepository = feeRepository;
        this.feePeriodRepository = feePeriodRepository;
        this.systemConfigRepository = systemConfigRepository;
        this.complaintRepository = complaintRepository;
        this.notificationRepository = notificationRepository;
        this.notificationRecipientRepository = notificationRecipientRepository;
        this.userRepository = userRepository;
        this.roleRepository = roleRepository;
        this.passwordEncoder = passwordEncoder;
        this.feePeriodService = feePeriodService;
    }

    @Override
    @Transactional
    public void run(String... args) {
        // Đơn giá hệ thống luôn được đảm bảo tồn tại (idempotent), kể cả khi DB đã có dữ liệu cũ
        // -> khi Admin import hóa đơn điện/nước/internet luôn có đơn giá để tính tiền.
        seedSystemConfigs();

        // Chốt chặn idempotent: chỉ seed khi DB chưa có hạ tầng căn hộ.
        if (apartmentRepository.count() > 0) {
            System.out.println("[InitialDataConfig] Đã có dữ liệu căn hộ -> bỏ qua sinh dữ liệu mẫu.");
        } else {
            System.out.println("[InitialDataConfig] Bắt đầu sinh dữ liệu mẫu...");

            seedInfrastructure();
            List<Household> households = seedHouseholdsAndResidents();
            seedVehiclesAndParking(households);
            seedFinance(households);
            seedInteractions(households);

            System.out.println("[InitialDataConfig] Hoàn tất sinh dữ liệu mẫu.");
            System.out.println("[InitialDataConfig] Hóa đơn điện/nước/internet KHÔNG seed vào DB. "
                    + "Hãy nhập từ file mẫu: Backend/sample-data/hoa-don-dien-nuoc.xlsx "
                    + "qua chức năng 'Nhập hóa đơn hàng loạt'.");
        }

        // Luôn đảm bảo mọi đợt thu đã có phiếu thu (Payment). Chạy cả với DB cũ:
        // các đợt thu được seed/tạo trước khi có cơ chế tự sinh phiếu sẽ được backfill,
        // nhờ vậy màn hình "Thu phí / Công nợ" mới có dữ liệu để hiển thị.
        int fixedPeriods = feePeriodService.backfillMissingPayments();
        if (fixedPeriods > 0) {
            System.out.printf("[InitialDataConfig] Đã backfill phiếu thu cho %d đợt thu chưa có phiếu.%n", fixedPeriods);
        }
    }


    // Hạ tầng – Căn hộ & Chỗ gửi xe
    private void seedInfrastructure() {
        List<Apartment> apartments = new ArrayList<>();

        // Tầng 1: 4 ki-ốt thương mại
        for (int i = 0; i < KIOSK_AREAS.length; i++) {
            String code = String.format("K01-%02d", i + 1);
            apartments.add(buildApartment(code, 1, KIOSK_AREAS[i],
                    "Ki-ốt thương mại tầng 1 (Sảnh chờ)"));
        }

        // Tầng 6-29
        for (int floor = TYPICAL_FLOOR_START; floor <= TYPICAL_FLOOR_END; floor++) {
            for (int i = 0; i < TYPICAL_AREAS.length; i++) {
                String code = String.format("A%02d-%02d", floor, i + 1);
                apartments.add(buildApartment(code, floor, TYPICAL_AREAS[i], null));
            }
        }

        // Tầng 30: Penthouse
        apartments.add(buildApartment("PH30-01", PENTHOUSE_FLOOR, PENTHOUSE_AREA,
                "Căn hộ Penthouse"));

        apartmentRepository.saveAll(apartments);

        // Bãi xe
        List<ParkingSlot> slots = new ArrayList<>();
        for (String floorCode : List.of("B1", "B2")) {
            for (int i = 1; i <= CAR_SLOTS_PER_FLOOR; i++) {
                slots.add(buildSlot(String.format("%s-%03d", floorCode, i), VehicleType.CAR));
            }
        }
        for (String floorCode : List.of("B3", "B4")) {
            for (int i = 1; i <= MOTORBIKE_SLOTS_PER_FLOOR; i++) {
                slots.add(buildSlot(String.format("%s-%03d", floorCode, i), VehicleType.MOTORBIKE));
            }
        }
        parkingSlotRepository.saveAll(slots);

        System.out.printf("[InitialDataConfig] Đã tạo %d căn hộ, %d chỗ gửi xe.%n",
                apartments.size(), slots.size());
    }

    private Apartment buildApartment(String code, int floor, int area, String note) {
        Apartment a = new Apartment();
        a.setCode(code);
        a.setFloor(floor);
        a.setArea(BigDecimal.valueOf(area));
        a.setStatus(ApartmentStatus.AVAILABLE);
        a.setNote(note);
        return a;
    }

    private ParkingSlot buildSlot(String code, VehicleType type) {
        ParkingSlot s = new ParkingSlot();
        s.setCode(code);
        s.setType(type);
        s.setStatus(ParkingSlotStatus.EMPTY);
        return s;
    }

    // Cư dân & Hộ gia đình (kèm tài khoản RESIDENT để đăng nhập / nhận thông báo)
    private List<Household> seedHouseholdsAndResidents() {
        // Chỉ gán hộ cho các căn ở (tầng >= 6), bỏ qua ki-ốt thương mại tầng 1.
        // Chọn NGẪU NHIÊN các căn được ở (xáo trộn). File Excel mẫu hóa đơn liệt kê TẤT CẢ
        // mã hộ có thể có (HK-A06-01 ... HK-PH30-01); khi import, dòng nào trỏ tới hộ chưa
        // tồn tại sẽ tự động bị bỏ qua nên file vẫn dùng được dù hộ là ngẫu nhiên.
        List<Apartment> residential = new ArrayList<>(apartmentRepository.findAll().stream()
                .filter(a -> a.getFloor() >= TYPICAL_FLOOR_START)
                .toList());
        Collections.shuffle(residential, random);

        int target = Math.min(TARGET_HOUSEHOLDS, residential.size());
        Role residentRole = getOrCreateResidentRole();

        List<Household> result = new ArrayList<>(target);
        for (int i = 0; i < target; i++) {
            Apartment apartment = residential.get(i);
            apartment.setStatus(ApartmentStatus.OCCUPIED);

            Household household = new Household();
            household.setCode("HK-" + apartment.getCode());
            household.setApartment(apartment);
            household.setMoveInDate(randomPastDate(5 * 365));
            household.setStatus(HouseholdStatus.ACTIVE);
            household = householdRepository.save(household);

            // Sinh 2..4 nhân khẩu, đảm bảo có đúng 1 chủ hộ.
            int memberCount = 2 + random.nextInt(3); // 2, 3 hoặc 4
            Resident head = null;
            for (int m = 0; m < memberCount; m++) {
                Resident r = buildResident(household, m);
                r = residentRepository.save(r);
                if (m == 0) head = r;
            }
            household.setHeadOfHousehold(head);
            householdRepository.save(household);

            // Tài khoản cư dân (đăng nhập + là người gửi phản ánh / nhận thông báo).
            createResidentUser(apartment, household, head, residentRole);

            result.add(household);
        }

        apartmentRepository.saveAll(residential.subList(0, target));
        System.out.printf("[InitialDataConfig] Đã tạo %d hộ gia đình + nhân khẩu + tài khoản cư dân.%n", target);
        return result;
    }

    private Resident buildResident(Household household, int memberIndex) {
        Resident r = new Resident();
        r.setHousehold(household);
        r.setResidencyStatus(ResidencyStatus.PERMANENT);
        r.setStatus(ResidentStatus.ACTIVE);
        r.setIdCard(faker.number().digits(12)); // CCCD 12 số
        r.setFullName(faker.name().fullName());

        if (memberIndex == 0) {
            // Chủ hộ: người lớn
            r.setRelationToHead("CHU_HO");
            r.setGender(random.nextBoolean() ? Gender.MALE : Gender.FEMALE);
            r.setDateOfBirth(faker.timeAndDate().birthday(30, 65));
        } else if (memberIndex == 1) {
            // Vợ/chồng
            r.setRelationToHead("VO_CHONG");
            r.setGender(random.nextBoolean() ? Gender.MALE : Gender.FEMALE);
            r.setDateOfBirth(faker.timeAndDate().birthday(28, 60));
        } else {
            // Con cái
            r.setRelationToHead("CON");
            r.setGender(random.nextBoolean() ? Gender.MALE : Gender.FEMALE);
            r.setDateOfBirth(faker.timeAndDate().birthday(1, 25));
        }
        return r;
    }

    private void createResidentUser(Apartment apartment, Household household,
                                    Resident head, Role residentRole) {
        // username suy ra từ mã căn hộ -> duy nhất (mã căn hộ là UNIQUE).
        String username = "cudan_" + apartment.getCode().toLowerCase().replace("-", "");
        if (userRepository.existsByUsername(username)) {
            return;
        }
        User u = User.builder()
                .username(username)
                .passwordHash(passwordEncoder.encode(RESIDENT_PASSWORD))
                .fullName(head != null ? head.getFullName() : faker.name().fullName())
                .email(username + "@chungcu.local")
                .phone(randomVietnamesePhone())
                .active(true)
                .emailVerified(true)
                .role(residentRole)
                .household(household)
                .resident(head) // gắn nhân khẩu đại diện (chủ hộ) cho tài khoản cư dân
                .build();
        userRepository.save(u);
    }

    private Role getOrCreateResidentRole() {
        return roleRepository.findByName("RESIDENT")
                .orElseGet(() -> roleRepository.save(Role.builder().name("RESIDENT").build()));
    }

    // Phương tiện & Gửi xe
    private void seedVehiclesAndParking(List<Household> households) {
        // Hàng đợi các chỗ trống theo loại xe để cấp phát nhanh, đổi trạng thái sang USED.
        Deque<ParkingSlot> freeCarSlots = new ArrayDeque<>(
                parkingSlotRepository.findAll().stream()
                        .filter(s -> s.getType() == VehicleType.CAR && s.getStatus() == ParkingSlotStatus.EMPTY)
                        .toList());
        Deque<ParkingSlot> freeMotorbikeSlots = new ArrayDeque<>(
                parkingSlotRepository.findAll().stream()
                        .filter(s -> s.getType() == VehicleType.MOTORBIKE && s.getStatus() == ParkingSlotStatus.EMPTY)
                        .toList());

        int vehicleCount = 0;
        int parkedCount = 0;
        BigDecimal carParkingPrice = getSystemConfigValue(SystemConfig.CAR_PARKING_PRICE);
        BigDecimal motorbikeParkingPrice = getSystemConfigValue(SystemConfig.MOTORBIKE_PARKING_PRICE);

        for (Household household : households) {
            int numVehicles = 1 + random.nextInt(2); // 1 hoặc 2 xe
            for (int i = 0; i < numVehicles; i++) {
                // Xe máy phổ biến hơn (≈70%)
                VehicleType type = random.nextInt(10) < 7 ? VehicleType.MOTORBIKE : VehicleType.CAR;

                // Tìm chỗ trống tương ứng loại xe; nếu hết chỗ thì bỏ qua
                Deque<ParkingSlot> pool = (type == VehicleType.CAR) ? freeCarSlots : freeMotorbikeSlots;
                ParkingSlot slot = pool.poll();
                if (slot == null) {
                    continue;
                }

                Vehicle vehicle = new Vehicle();
                vehicle.setHousehold(household);
                vehicle.setType(type);
                vehicle.setLicensePlate(generateLicensePlate(type));
                vehicle.setRegisteredDate(randomPastDate(3 * 365));
                vehicle.setActive(true);
                vehicle = vehicleRepository.save(vehicle);
                vehicleCount++;

                slot.setStatus(ParkingSlotStatus.USED);
                parkingSlotRepository.save(slot);

                ParkingRegistration reg = new ParkingRegistration();
                reg.setSlot(slot);
                reg.setVehicle(vehicle);
                reg.setStartDate(vehicle.getRegisteredDate());
                reg.setMonthlyFee(type == VehicleType.CAR ? carParkingPrice : motorbikeParkingPrice);
                reg.setStatus(ParkingRegistrationStatus.ACTIVE);
                parkingRegistrationRepository.save(reg);
                parkedCount++;
            }
        }

        System.out.printf("[InitialDataConfig] Đã tạo %d phương tiện, %d lượt đăng ký gửi xe.%n",
                vehicleCount, parkedCount);
    }

    // BƯỚC 4: Tài chính – Phí & Kỳ thu phí
    // (Hóa đơn điện/nước/internet KHÔNG seed ở đây — nhập từ file Excel mẫu.)
    private void seedFinance(List<Household> households) {
        // --- Các loại phí cơ bản ---
        Fee mgmtFee = buildFee("Phí quản lý", "MANDATORY", "PER_M2", BigDecimal.valueOf(7_000),
                "Phí quản lý vận hành tính theo m² diện tích căn hộ");
        Fee cleaningFee = buildFee("Phí vệ sinh", "MANDATORY", "FIXED", BigDecimal.valueOf(50_000),
                "Phí vệ sinh khu vực chung, thu cố định theo hộ");
        Fee maintenanceFee = buildFee("Phí bảo trì", "MANDATORY", "PER_M2", BigDecimal.valueOf(2_000),
                "Phí bảo trì hạ tầng tính theo m² diện tích căn hộ");
        List<Fee> fees = feeRepository.saveAll(List.of(mgmtFee, cleaningFee, maintenanceFee));

        // --- Kỳ thu phí tháng hiện tại cho từng loại phí (FeePeriod bắt buộc gắn 1 Fee) ---
        YearMonth now = YearMonth.now();
        LocalDate start = now.atDay(1);
        LocalDate end = now.atEndOfMonth();
        String periodLabel = String.format("Kỳ thu phí tháng %02d/%d", now.getMonthValue(), now.getYear());
        for (Fee fee : fees) {
            FeePeriod period = new FeePeriod();
            period.setFee(fee);
            period.setName(periodLabel + " - " + fee.getName());
            period.setStartDate(start);
            period.setEndDate(end);
            period.setStatus("OPEN");
            feePeriodRepository.save(period);
        }

        System.out.printf("[InitialDataConfig] Đã tạo %d loại phí, %d kỳ thu phí.%n",
                fees.size(), fees.size());
    }

    // Seed đơn giá gốc dùng chung cho hóa đơn điện/nước/internet (Admin import dùng để tính tiền).
    private void seedSystemConfigs() {
        saveConfigIfAbsent(SystemConfig.ELECTRICITY_UNIT_PRICE, BigDecimal.valueOf(3_500),
                "Đơn giá 1 số điện (đ/kWh)");
        saveConfigIfAbsent(SystemConfig.WATER_UNIT_PRICE, BigDecimal.valueOf(15_000),
                "Đơn giá 1 khối nước (đ/m³)");
        saveConfigIfAbsent(SystemConfig.INTERNET_PRICE, BigDecimal.valueOf(250_000),
                "Giá gói internet/tháng (đ)");
        saveConfigIfAbsent(SystemConfig.MOTORBIKE_PARKING_PRICE, BigDecimal.valueOf(70_000),
                "Phí gửi xe máy/tháng (đ)");
        saveConfigIfAbsent(SystemConfig.CAR_PARKING_PRICE, BigDecimal.valueOf(1_200_000),
                "Phí gửi ô tô/tháng (đ)");
    }

    private void saveConfigIfAbsent(String key, BigDecimal value, String description) {
        if (!systemConfigRepository.existsByConfigKey(key)) {
            systemConfigRepository.save(new SystemConfig(null, key, value, description));
        }
    }

    private BigDecimal getSystemConfigValue(String key) {
        return systemConfigRepository.findByConfigKey(key)
                .map(SystemConfig::getConfigValue)
                .orElseThrow(() -> new IllegalStateException("Missing system config: " + key));
    }

    private Fee buildFee(String name, String type, String unit, BigDecimal unitPrice, String description) {
        Fee fee = new Fee();
        fee.setName(name);
        fee.setType(type);
        fee.setUnit(unit);
        fee.setUnitPrice(unitPrice);
        fee.setDescription(description);
        fee.setActive(true);
        return fee;
    }

    // Tương tác – Phản ánh & Thông báo
    private void seedInteractions(List<Household> households) {
        // --- Khoảng 10 phản ánh ngẫu nhiên từ cư dân ---
        String[][] complaintSamples = {
                {"CLEANING", "Rác để tràn ở hành lang", "Khu vực hành lang tầng để rác quá lâu chưa được thu gom, gây mùi khó chịu."},
                {"SECURITY", "Đèn hành lang bị hỏng", "Đèn chiếu sáng khu hành lang bị hỏng vài ngày nay, buổi tối rất tối và mất an toàn."},
                {"SECURITY", "Người lạ ra vào toà nhà", "Đề nghị ban quản lý kiểm soát chặt hơn người lạ ra vào sảnh chính."},
                {"CLEANING", "Thang máy bẩn", "Thang máy số 2 lâu ngày chưa được lau dọn, sàn rất bẩn."},
                {"FEE", "Thắc mắc về phí quản lý", "Tôi muốn được giải thích rõ hơn về cách tính phí quản lý tháng này."},
                {"OTHER", "Tiếng ồn từ căn hộ bên cạnh", "Căn hộ bên cạnh thường xuyên gây ồn vào ban đêm, mong ban quản lý nhắc nhở."},
                {"SECURITY", "Cửa thoát hiểm không khoá", "Cửa thoát hiểm tầng hầm không được đóng kín, tiềm ẩn nguy cơ mất an ninh."},
                {"CLEANING", "Mùi hôi từ ống xả rác", "Khu vực ống xả rác bốc mùi rất nặng vào buổi trưa."},
                {"OTHER", "Wifi sảnh chung yếu", "Mạng wifi khu sảnh tầng 1 rất yếu, đề nghị nâng cấp."},
                {"FEE", "Hóa đơn nước cao bất thường", "Hóa đơn tiền nước tháng này cao gấp đôi bình thường, nhờ kiểm tra lại đồng hồ."},
        };

        // Chỉ những hộ đã có tài khoản cư dân mới gửi được phản ánh (sender bắt buộc là User).
        List<User> residentUsers = userRepository.findActiveResidents();
        if (residentUsers.isEmpty()) {
            System.out.println("[InitialDataConfig] Không có tài khoản cư dân -> bỏ qua tạo phản ánh.");
        } else {
            int complaintTarget = Math.min(TARGET_COMPLAINTS, complaintSamples.length);
            for (int i = 0; i < complaintTarget; i++) {
                User sender = residentUsers.get(random.nextInt(residentUsers.size()));
                String[] sample = complaintSamples[i];

                Complaint complaint = new Complaint();
                complaint.setSender(sender);
                complaint.setHousehold(sender.getHousehold());
                complaint.setCategory(ComplaintCategory.valueOf(sample[0]));
                complaint.setTitle(sample[1]);
                complaint.setContent(sample[2]);
                complaint.setStatus(ComplaintStatus.NEW);
                complaintRepository.save(complaint);
            }
            System.out.printf("[InitialDataConfig] Đã tạo %d phản ánh.%n", complaintTarget);
        }

        // --- 2..3 thông báo từ ban quản lý gửi cho toàn bộ cư dân ---
        User admin = userRepository.findByUsername("admin").orElse(null);
        String[][] notificationSamples = {
                {"Thông báo lịch phun khử khuẩn định kỳ",
                        "Ban quản lý sẽ tiến hành phun khử khuẩn toàn bộ khu vực chung vào Chủ nhật tuần này. Kính mong cư dân phối hợp."},
                {"Thông báo bảo trì thang máy",
                        "Thang máy số 1 sẽ tạm dừng để bảo trì từ 8h00 đến 11h00 ngày mai. Mong cư dân thông cảm và sử dụng thang máy còn lại."},
                {"Thông báo họp cư dân định kỳ",
                        "Ban quản lý tổ chức buổi họp cư dân vào 19h30 thứ Bảy tại sảnh sinh hoạt cộng đồng tầng 1. Rất mong cư dân tham dự đầy đủ."},
        };

        List<User> allResidents = residentUsers; // người nhận = toàn bộ cư dân đang hoạt động
        int notiCount = 2 + random.nextInt(2); // 2 hoặc 3
        notiCount = Math.min(notiCount, notificationSamples.length);
        for (int i = 0; i < notiCount; i++) {
            Notification noti = new Notification();
            noti.setTitle(notificationSamples[i][0]);
            noti.setContent(notificationSamples[i][1]);
            noti.setScope(NotificationScope.ALL);
            noti.setSender(admin);
            Notification saved = notificationRepository.save(noti);

            // Vật chất hoá người nhận để cư dân xem được trong hộp thông báo của mình.
            if (!allResidents.isEmpty()) {
                List<NotificationRecipient> recipients = new ArrayList<>(allResidents.size());
                for (User u : allResidents) {
                    NotificationRecipient nr = new NotificationRecipient();
                    nr.setNotification(saved);
                    nr.setRecipient(u);
                    nr.setIsRead(false);
                    recipients.add(nr);
                }
                notificationRecipientRepository.saveAll(recipients);
            }
        }
        System.out.printf("[InitialDataConfig] Đã tạo %d thông báo gửi toàn bộ cư dân.%n", notiCount);
    }

    // Helpers

    // Ngày ngẫu nhiên trong khoảng [hôm nay - maxDaysAgo, hôm nay].
    private LocalDate randomPastDate(int maxDaysAgo) {
        return LocalDate.now().minusDays(random.nextInt(maxDaysAgo + 1));
    }

    // Số điện thoại di động dạng 0xxxxxxxxx (10 số).
    private String randomVietnamesePhone() {
        String[] prefixes = {"032", "033", "034", "035", "036", "037", "038", "039",
                "070", "076", "077", "078", "079",
                "081", "082", "083", "084", "085", "088",
                "090", "091", "094", "096", "097", "098"};
        return prefixes[random.nextInt(prefixes.length)] + faker.number().digits(7);
    }

//      Sinh biển số xe Việt Nam. Phần số chạy theo bộ đếm toàn cục {@code plateSequence}
//      nên luôn duy nhất (cột license_plate có ràng buộc UNIQUE).

    private String generateLicensePlate(VehicleType type) {
        int province = 11 + random.nextInt(88);
        char series = (char) ('A' + random.nextInt(26));
        int seq = ++plateSequence; // 1..N, đảm bảo không trùng
        if (type == VehicleType.CAR) {
            // VD: 30A-12345
            return String.format("%02dA-%05d", province, 10000 + (seq % 90000));
        }
        // Xe máy, VD: 29-B1 234.56
        return String.format("%02d-%c%d %03d.%02d",
                province, series, random.nextInt(10), seq % 1000, seq % 100);
    }
}
