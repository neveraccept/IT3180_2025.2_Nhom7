package org.example.backend.service;

import org.example.backend.aspect.AuditContext;
import org.example.backend.aspect.LogAdminAction;
import org.example.backend.dto.AccountCreatedDTO;
import org.example.backend.dto.UserDTO;
import org.example.backend.dto.request.AdminRegisterRequest;
import org.example.backend.dto.request.AdminUpdateRegisterRequest;
import org.example.backend.dto.request.ApproveAccountRequest;
import org.example.backend.entity.Apartment;
import org.example.backend.entity.Household;
import org.example.backend.entity.Resident;
import org.example.backend.entity.Role;
import org.example.backend.entity.User;
import org.example.backend.entity.enums.ApartmentStatus;
import org.example.backend.entity.enums.HouseholdStatus;
import org.example.backend.entity.enums.ResidencyStatus;
import org.example.backend.entity.enums.ResidentStatus;
import org.example.backend.repository.*;
import org.example.backend.service.mapper.UserMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
public class UserService {
    private static final Logger log = LoggerFactory.getLogger(UserService.class);

    private final UserRepository userRepo;
    private final RoleRepository roleRepo;
    private final ApartmentRepository apartmentRepo;
    private final HouseholdRepository householdRepo;
    private final ResidentRepository residentRepo;
    private final PasswordEncoder passwordEncoder;
    private final EmailService emailService;
    private final UserMapper userMapper;
    private final NotificationService notificationService;

    // Mật khẩu tạm thời mặc định khi Admin cấp tài khoản cho cư dân.
    private static final SecureRandom RANDOM = new SecureRandom();
    private static final String DEFAULT_RESIDENT_PASSWORD = "user123";

    @Autowired
    public UserService(UserRepository userRepo,
                       RoleRepository roleRepo,
                       ApartmentRepository apartmentRepo,
                       HouseholdRepository householdRepo,
                       ResidentRepository residentRepo,
                       PasswordEncoder passwordEncoder,
                       EmailService emailService,
                       UserMapper userMapper,
                       NotificationService notificationService) {
        this.userRepo = userRepo;
        this.roleRepo = roleRepo;
        this.apartmentRepo = apartmentRepo;
        this.householdRepo = householdRepo;
        this.residentRepo = residentRepo;
        this.passwordEncoder = passwordEncoder;
        this.emailService = emailService;
        this.userMapper = userMapper;
        this.notificationService = notificationService;
    }

    //Admin tạo tài khoản nội bộ
    @LogAdminAction(entity = "User", action = "CREATE", description = "Tạo tài khoản nội bộ",
            detail = "'Tài khoản: ' + #result.username")
    @Transactional
    public User createInternalAccount(AdminRegisterRequest req) {
        if (userRepo.existsByUsername(req.username())) {
            throw new IllegalArgumentException("Username đã được sử dụng");
        }

        // Kiểm tra xác nhận lại mật khẩu đã đúng chưa
        if (!req.password().equals(req.confirmPassword())) {
            throw new IllegalArgumentException("Mật khẩu xác nhận không khớp. Vui lòng kiểm tra lại!");
        }

        // Kiểm tra email đã tồn tại chưa
        if (userRepo.existsByEmail(req.email())) {
            throw new IllegalArgumentException("Email đã được sử dụng!");
        }

        Role role = roleRepo.findByName(req.role())
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy vai trò: " + req.role()));

        User newUser = new User();
        newUser.setUsername(req.username());
        newUser.setFullName(req.fullName());
        newUser.setEmail(req.email());
        newUser.setPhone(req.phone());
        newUser.setRequestedApartmentCode(req.requestedApartmentCode());

        // Mã hóa mật khẩu từ DTO
        newUser.setPasswordHash(passwordEncoder.encode(req.password()));

        // Tìm và set Role
        newUser.setRole(role);

        // Chỉ tài khoản cư dân (RESIDENT) mới gắn vào hộ/nhân khẩu.
        // Tài khoản nội bộ (ADMIN/Kế toán...) bỏ qua, không cần căn hộ.
        boolean isResident = "RESIDENT".equals(role.getName());
        if (isResident && req.requestedApartmentCode() != null && !req.requestedApartmentCode().isBlank()) {
            // Gắn/tạo nhân khẩu rồi suy ra hộ — đảm bảo tài khoản cư dân luôn có nhân khẩu thật trong hộ.
            linkOrCreateResident(newUser, req.toResidentLink());
        }

        newUser.setActive(true);
        newUser.setEmailVerified(true);

        User saved = userRepo.saveAndFlush(newUser);
        notificationService.backfillRecipientsForNewResidentAccount(saved);
        return saved;
    }

    // Duyệt tài khoản cư dân đã đăng ký
    @LogAdminAction(entity = "User", action = "UPDATE", description = "Duyệt tài khoản cư dân",
            detail = "'Tài khoản: ' + #result.username")
    @Transactional
    public User approvePendingAccount(Long id, ApproveAccountRequest req) {
        // 1. Tìm tài khoản cư dân theo ID
        User user = userRepo.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy tài khoản với ID: " + id));

        // 2. Kiểm tra xem tài khoản đã được duyệt trước đó chưa
        if (user.isActive()) {
            throw new IllegalArgumentException("Tài khoản này đã được kích hoạt từ trước!");
        }

        // 3. Gắn/tạo nhân khẩu cho tài khoản dựa trên mã căn hộ đã yêu cầu khi đăng ký:
        //    - Căn hộ đã có hộ ACTIVE -> gắn nhân khẩu có sẵn HOẶC tạo nhân khẩu mới (thành viên).
        //    - Căn hộ trống          -> tạo hộ mới, người này làm chủ hộ (Cách A1).
        //    Set cả user.resident (nguồn sự thật) lẫn user.household (denormalized) để mọi truy vấn theo hộ hoạt động.
        linkOrCreateResident(user, req);

        // 4. Duyệt tài khoản
        user.setActive(true);

        // 5. Lưu thay đổi
        User saved = userRepo.saveAndFlush(user);
        notificationService.backfillRecipientsForNewResidentAccount(saved);
        return saved;
    }

    /**
     * Từ chối tài khoản đăng ký: Xóa hoàn toàn khỏi database.
     * Chỉ áp dụng cho tài khoản chưa được duyệt (active = false).
     */
    @LogAdminAction(entity = "User", action = "DELETE", description = "Từ chối & xóa tài khoản chờ duyệt")
    @Transactional
    public void rejectPendingAccount(Long id, String reason) {
        // 1. Tìm tài khoản theo ID
        User user = userRepo.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy tài khoản với ID: " + id));

        // 2. Chặn việc xóa nhầm tài khoản đang hoạt động
        if (user.isActive()) {
            throw new IllegalArgumentException("Tài khoản này đã được duyệt và đang hoạt động, KHÔNG THỂ xóa bằng chức năng này!");
        }

        // 3. Gửi email báo cho cư dân biết họ bị từ chối (kèm lý do nếu có).
        //    Nuốt lỗi gửi mail để KHÔNG làm rollback việc từ chối chỉ vì SMTP gặp sự cố.
        try {
            emailService.sendRejectionEmail(user.getEmail(), reason);
        } catch (Exception e) {
            log.warn("Gửi email từ chối tài khoản '{}' thất bại: {}", user.getUsername(), e.getMessage());
        }

        // 4. Xóa tài khoản khỏi Database
        userRepo.delete(user);
        String detail = "Từ chối & xóa tài khoản chờ duyệt: " + user.getUsername();
        if (reason != null && !reason.isBlank()) {
            detail += " | Lý do: " + reason.trim();
        }
        AuditContext.detail(detail);
    }

    /**
     * Gắn/tạo nhân khẩu cho một tài khoản cư dân dựa trên mã căn hộ đã yêu cầu, rồi suy ra hộ.
     * Đây là điểm thống nhất cho cả luồng DUYỆT (approve) lẫn ADMIN TẠO tài khoản (createInternal).
     *
     * Quy tắc:
     *  - Căn hộ đã có hộ ACTIVE:
     *      + link.linkResidentId != null -> gắn vào nhân khẩu sẵn có (kiểm tra thuộc hộ, còn ACTIVE, chưa có tài khoản).
     *      + ngược lại                   -> tạo nhân khẩu MỚI (thành viên) từ thông tin trong link.
     *  - Căn hộ TRỐNG (chưa có hộ ACTIVE) — Cách A1:
     *      + tạo hộ mới (newHouseholdCode + moveInDate), người này làm CHỦ HỘ, căn hộ -> OCCUPIED.
     *
     * Luôn set cả user.resident (nguồn sự thật) lẫn user.household (denormalized).
     */
    private void linkOrCreateResident(User user, ApproveAccountRequest link) {
        String code = user.getRequestedApartmentCode();
        if (code == null || code.isBlank()) {
            throw new IllegalArgumentException(
                    "Tài khoản chưa khai báo mã căn hộ. Không thể gán hộ dân.");
        }

        Apartment apartment = apartmentRepo.findByCode(code.trim())
                .orElseThrow(() -> new IllegalArgumentException(
                        "Không tìm thấy căn hộ với mã '" + code + "'."));

        Optional<Household> activeHousehold = householdRepo
                .findByApartmentIdAndStatus(apartment.getId(), HouseholdStatus.ACTIVE);

        Resident resident;
        if (activeHousehold.isPresent()) {
            Household household = activeHousehold.get();
            if (link != null && link.linkResidentId() != null) {
                resident = linkExistingResident(link.linkResidentId(), household);
            } else {
                // Thành viên mới của hộ hiện có.
                String relation = (link != null && link.relationToHead() != null && !link.relationToHead().isBlank())
                        ? link.relationToHead().trim() : "Thành viên";
                resident = createResident(user, household, link, relation);
            }
        } else {
            // ----- Cách A1: căn hộ trống -> tạo hộ mới, người này làm chủ hộ -----
            resident = createHouseholdWithHead(user, apartment, link);
        }

        user.setResident(resident);
        user.setHousehold(resident.getHousehold());
    }

    /** Gắn tài khoản vào một nhân khẩu sẵn có trong hộ ACTIVE. */
    private Resident linkExistingResident(Long residentId, Household household) {
        Resident resident = residentRepo.findById(residentId)
                .orElseThrow(() -> new IllegalArgumentException(
                        "Không tìm thấy nhân khẩu id = " + residentId));

        if (resident.getHousehold() == null
                || !resident.getHousehold().getId().equals(household.getId())) {
            throw new IllegalArgumentException(
                    "Nhân khẩu được chọn không thuộc hộ đang cư trú tại căn hộ này.");
        }
        if (resident.getStatus() != ResidentStatus.ACTIVE) {
            throw new IllegalArgumentException(
                    "Nhân khẩu '" + resident.getFullName() + "' đã chuyển đi, không thể gán tài khoản.");
        }
        if (userRepo.existsByResident_IdAndDeletedFalse(residentId)) {
            throw new IllegalArgumentException(
                    "Nhân khẩu '" + resident.getFullName() + "' đã có tài khoản đăng nhập.");
        }
        return resident;
    }

    /** Cách A1: tạo hộ mới cho căn hộ trống và đặt người dùng làm chủ hộ. */
    private Resident createHouseholdWithHead(User user, Apartment apartment, ApproveAccountRequest link) {
        if (link == null || link.newHouseholdCode() == null || link.newHouseholdCode().isBlank()) {
            throw new IllegalArgumentException(
                    "Căn hộ '" + apartment.getCode() + "' chưa có hộ dân. "
                            + "Vui lòng nhập MÃ HỘ KHẨU mới để lập hộ và đặt cư dân này làm chủ hộ.");
        }
        String householdCode = link.newHouseholdCode().trim();
        if (householdRepo.existsByCode(householdCode)) {
            throw new IllegalArgumentException("Mã hộ khẩu '" + householdCode + "' đã tồn tại.");
        }

        Household household = new Household();
        household.setCode(householdCode);
        household.setApartment(apartment);
        household.setMoveInDate(link.moveInDate() != null ? link.moveInDate() : LocalDate.now());
        household.setStatus(HouseholdStatus.ACTIVE);
        household = householdRepo.saveAndFlush(household);

        Resident head = createResident(user, household, link, "CHU_HO");

        household.setHeadOfHousehold(head);
        householdRepo.save(household);

        apartment.setStatus(ApartmentStatus.OCCUPIED);
        apartmentRepo.save(apartment);

        return head;
    }

    /** Tạo bản ghi nhân khẩu (Resident) cho tài khoản, lấy họ tên từ chính tài khoản. */
    private Resident createResident(User user, Household household, ApproveAccountRequest link, String relationToHead) {
        if (link == null) {
            throw new IllegalArgumentException(
                    "Thiếu thông tin nhân khẩu (CCCD, ngày sinh, giới tính) để tạo cư dân cho tài khoản.");
        }
        String idCard = link.idCard() == null ? null : link.idCard().trim();
        if (idCard == null || idCard.isBlank()) {
            throw new IllegalArgumentException("Vui lòng nhập CCCD/CMND để tạo nhân khẩu cho tài khoản.");
        }
        if (!idCard.matches("\\d{9}|\\d{12}")) {
            throw new IllegalArgumentException("CCCD/CMND phải là 9 hoặc 12 chữ số.");
        }
        if (residentRepo.existsByIdCard(idCard)) {
            throw new IllegalArgumentException("CCCD/CMND " + idCard + " đã tồn tại trong hệ thống.");
        }

        Resident r = new Resident();
        r.setFullName(user.getFullName());
        r.setIdCard(idCard);
        r.setDateOfBirth(link.dateOfBirth());
        r.setGender(link.gender());
        r.setRelationToHead(relationToHead);
        r.setResidencyStatus(link.residencyStatus() == null ? ResidencyStatus.PERMANENT : link.residencyStatus());
        r.setStatus(ResidentStatus.ACTIVE);
        r.setHousehold(household);
        return residentRepo.save(r);
    }

    // Admin chỉnh sửa thông tin tài khoản.
    @LogAdminAction(entity = "User", action = "UPDATE", description = "Cập nhật thông tin tài khoản",
            detail = "'Tài khoản: ' + #result.username()")
    @Transactional
    public UserDTO updateAccountInfo(Long id, AdminUpdateRegisterRequest req) {
        // 1. Tìm tài khoản cư dân theo ID
        User user = userRepo.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy tài khoản với ID: " + id));

        if (user.isDeleted()) {
            throw new IllegalArgumentException("Tài khoản đã bị xóa, không thể cập nhật.");
        }

        if (req.username() != null && !req.username().isBlank()) {
            String username = req.username().trim();
            if (!username.equals(user.getUsername()) && userRepo.existsByUsername(username)) {
                throw new IllegalArgumentException("Username đã được sử dụng");
            }
            user.setUsername(username);
        }

        if (req.fullName() != null && !req.fullName().isBlank()) {
            user.setFullName(req.fullName().trim());
        }

        if (req.email() != null && !req.email().isBlank()) {
            String email = req.email().trim();
            if (!email.equalsIgnoreCase(user.getEmail() == null ? "" : user.getEmail())
                    && userRepo.existsByEmail(email)) {
                throw new IllegalArgumentException("Email đã được sử dụng");
            }
            user.setEmail(email);
        }

        if (req.phone() != null) {
            user.setPhone(req.phone().trim());
        }

        if (req.role() != null && !req.role().isBlank()) {
            Role role = roleRepo.findByName(req.role().trim())
                    .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy vai trò: " + req.role()));
            user.setRole(role);
        }

        if (req.requestedApartmentCode() != null) {
            String apartmentCode = req.requestedApartmentCode().trim();
            user.setRequestedApartmentCode(apartmentCode.isBlank() ? null : apartmentCode);
            // KHÔNG gắn hộ/nhân khẩu ở bước chỉnh sửa. Việc gắn nhân khẩu (và tạo hộ nếu căn hộ trống)
            // được xử lý tập trung khi DUYỆT tài khoản (approvePendingAccount) để tránh tạo hộ "mồ côi".
        }

        User updatedUser = userRepo.saveAndFlush(user);
        return userMapper.toDto(updatedUser);
    }

    @Transactional(readOnly = true)
    public List<UserDTO> getPendingAccounts() {
        List<User> pendingUsers = userRepo.findPendingApprovals();

        // Chuyển đổi danh sách Entity sang danh sách DTO
        return pendingUsers.stream()
                .map(userMapper::toDto)
                .collect(Collectors.toList());
    }

    // Lấy toàn bộ tài khoản (Admin) phục vụ màn hình Quản lý tài khoản
    @Transactional(readOnly = true)
    public List<UserDTO> getAllUsers() {
        return userRepo.findAllWithRole().stream()
                .map(userMapper::toDto)
                .collect(Collectors.toList());
    }

    /**
     * Xóa mềm tài khoản (Admin): đặt deleted = true và active = false.
     * Không xóa cứng để tránh lỗi khóa ngoại với hóa đơn, khiếu nại, xe... đang tham chiếu tới user.
     */
    @LogAdminAction(entity = "User", action = "DELETE", description = "Xóa mềm tài khoản")
    @Transactional
    public void deleteUser(Long id) {
        User user = userRepo.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy tài khoản với ID: " + id));

        if (user.isDeleted()) {
            throw new IllegalArgumentException("Tài khoản này đã bị xóa trước đó!");
        }

        user.setDeleted(true);
        user.setActive(false);
        userRepo.saveAndFlush(user);
        AuditContext.detail("Xóa mềm tài khoản: " + user.getUsername());
    }

    // ===================================================================
    //  Luồng nghiệp vụ "cấp tài khoản theo cư dân" (Action 3) & khóa/mở khóa
    // ===================================================================

    /**
     * Action 3 – Cấp tài khoản cho một nhân khẩu sẵn có.
     * Ràng buộc: mỗi nhân khẩu chỉ có tối đa 1 tài khoản (chưa xóa).
     */
    @LogAdminAction(entity = "User", action = "CREATE", description = "Cấp tài khoản cho cư dân",
            detail = "'Tài khoản: ' + #result.username() + ' cho cư dân ' + #result.residentName()")
    @Transactional
    public AccountCreatedDTO grantAccess(Long residentId) {
        Resident resident = residentRepo.findById(residentId)
                .orElseThrow(() -> new IllegalArgumentException(
                        "Không tìm thấy nhân khẩu id = " + residentId));

        if (resident.getStatus() != ResidentStatus.ACTIVE) {
            throw new IllegalArgumentException(
                    "Nhân khẩu đã chuyển đi (MOVED_OUT), không thể cấp tài khoản.");
        }
        if (userRepo.existsByResident_IdAndDeletedFalse(residentId)) {
            throw new IllegalArgumentException(
                    "Cư dân '" + resident.getFullName() + "' đã có tài khoản đăng nhập.");
        }

        return createAccountForResident(resident);
    }

    /**
     * Tạo tài khoản đăng nhập (role RESIDENT) cho một nhân khẩu.
     * KHÔNG đánh dấu @Transactional để chạy chung giao dịch với hàm gọi
     * (move-in hoặc grant-access) — đảm bảo rollback đồng bộ nếu có lỗi.
     * Trả về mật khẩu tạm dạng plaintext để Admin bàn giao (chỉ 1 lần).
     */
    public AccountCreatedDTO createAccountForResident(Resident resident) {
        Role residentRole = roleRepo.findByName("RESIDENT")
                .orElseThrow(() -> new IllegalArgumentException(
                        "Không tìm thấy quyền cư dân (RESIDENT) trong hệ thống."));

        String username = generateUniqueUsername(resident);
        String rawPassword = generateTemporaryPassword();

        User user = new User();
        user.setUsername(username);
        user.setPasswordHash(passwordEncoder.encode(rawPassword));
        user.setFullName(resident.getFullName());
        user.setRole(residentRole);
        user.setResident(resident);
        // Giữ household_id song song để các truy vấn thanh toán/thông báo theo hộ hoạt động ngay.
        user.setHousehold(resident.getHousehold());
        user.setActive(true);
        user.setEmailVerified(true);
        user.setDeleted(false);

        User saved = userRepo.saveAndFlush(user);
        notificationService.backfillRecipientsForNewResidentAccount(saved);
        return new AccountCreatedDTO(
                saved.getId(), saved.getUsername(), rawPassword,
                residentRole.getName(), resident.getId(), resident.getFullName());
    }

    /**
     * Action 4 (phần tài khoản) – Khóa toàn bộ tài khoản gắn với một hộ khi cả hộ chuyển đi.
     * Chỉ khóa tài khoản cư dân (bỏ qua ADMIN để tránh tự khóa quản trị viên).
     * Trả về số tài khoản đã khóa. Chạy chung giao dịch với move-out.
     */
    public int lockUsersByHousehold(Long householdId) {
        List<User> accounts = userRepo.findAccountsByHousehold(householdId);
        int locked = 0;
        for (User u : accounts) {
            boolean isAdmin = u.getRole() != null && "ADMIN".equals(u.getRole().getName());
            if (isAdmin || !u.isActive()) {
                continue;
            }
            u.setActive(false);
            locked++;
        }
        if (locked > 0) {
            userRepo.saveAll(accounts);
        }
        return locked;
    }

    /** Khóa / mở khóa tài khoản thủ công (Admin). locked = true -> active = false. */
    @LogAdminAction(entity = "User", action = "UPDATE", description = "Khóa/mở khóa tài khoản",
            detail = "'Tài khoản: ' + #result.username()")
    @Transactional
    public UserDTO setUserLocked(Long id, boolean locked) {
        User user = userRepo.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy tài khoản với ID: " + id));
        if (user.isDeleted()) {
            throw new IllegalArgumentException("Tài khoản đã bị xóa, không thể thay đổi trạng thái khóa.");
        }
        user.setActive(!locked);
        User saved = userRepo.saveAndFlush(user);
        AuditContext.detail((locked ? "Khóa" : "Mở khóa") + " tài khoản: " + saved.getUsername());
        return userMapper.toDto(saved);
    }

    /** Danh sách tài khoản gắn với một hộ (phục vụ tab "Tài khoản" của trang Căn hộ). */
    @Transactional(readOnly = true)
    public List<UserDTO> getAccountsByHousehold(Long householdId) {
        return userRepo.findAccountsByHousehold(householdId).stream()
                .map(userMapper::toDto)
                .collect(Collectors.toList());
    }

    // Username gợi ý: "cd" + id nhân khẩu (ổn định, duy nhất). Nếu trùng (hiếm) thì thêm hậu tố ngẫu nhiên.
    private String generateUniqueUsername(Resident resident) {
        String base = "cd" + resident.getId();
        String candidate = base;
        while (userRepo.existsByUsername(candidate)) {
            candidate = base + RANDOM.nextInt(1000);
        }
        return candidate;
    }

    private String generateTemporaryPassword() {
        return DEFAULT_RESIDENT_PASSWORD;
    }

}
