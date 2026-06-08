package org.example.backend.service;

import org.example.backend.aspect.AuditContext;
import org.example.backend.aspect.LogAdminAction;
import org.example.backend.dto.AccountCreatedDTO;
import org.example.backend.dto.UserDTO;
import org.example.backend.dto.request.AdminRegisterRequest;
import org.example.backend.dto.request.AdminUpdateRegisterRequest;
import org.example.backend.entity.Apartment;
import org.example.backend.entity.Household;
import org.example.backend.entity.Resident;
import org.example.backend.entity.Role;
import org.example.backend.entity.User;
import org.example.backend.entity.enums.HouseholdStatus;
import org.example.backend.entity.enums.ResidentStatus;
import org.example.backend.repository.*;
import org.example.backend.service.mapper.UserMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class UserService {
    private final UserRepository userRepo;
    private final RoleRepository roleRepo;
    private final ApartmentRepository apartmentRepo;
    private final HouseholdRepository householdRepo;
    private final ResidentRepository residentRepo;
    private final PasswordEncoder passwordEncoder;
    private final EmailService emailService;
    private final UserMapper userMapper;

    // Sinh mật khẩu tạm thời an toàn khi Admin cấp tài khoản cho cư dân.
    private static final SecureRandom RANDOM = new SecureRandom();
    private static final String PASSWORD_ALPHABET =
            "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";

    @Autowired
    public UserService(UserRepository userRepo,
                       RoleRepository roleRepo,
                       ApartmentRepository apartmentRepo,
                       HouseholdRepository householdRepo,
                       ResidentRepository residentRepo,
                       PasswordEncoder passwordEncoder,
                       EmailService emailService,
                       UserMapper userMapper) {
        this.userRepo = userRepo;
        this.roleRepo = roleRepo;
        this.apartmentRepo = apartmentRepo;
        this.householdRepo = householdRepo;
        this.residentRepo = residentRepo;
        this.passwordEncoder = passwordEncoder;
        this.emailService = emailService;
        this.userMapper = userMapper;
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

        // Nếu có gắn Apartment cho User thì phải kiểm tra
        if(req.requestedApartmentCode() != null && !req.requestedApartmentCode().isBlank())
        {
            linkHouseholdByRequestedApartment(newUser);
        }

        newUser.setActive(true);
        newUser.setEmailVerified(true);

        return userRepo.saveAndFlush(newUser);
    }

    // Duyệt tài khoản cư dân đã đăng ký
    @LogAdminAction(entity = "User", action = "UPDATE", description = "Duyệt tài khoản cư dân",
            detail = "'Tài khoản: ' + #result.username")
    @Transactional
    public User approvePendingAccount(Long id) {
        // 1. Tìm tài khoản cư dân theo ID
        User user = userRepo.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy tài khoản với ID: " + id));

        // 2. Kiểm tra xem tài khoản đã được duyệt trước đó chưa
        if (user.isActive()) {
            throw new IllegalArgumentException("Tài khoản này đã được kích hoạt từ trước!");
        }

        // 3. Gán hộ dân dựa trên mã căn hộ mà cư dân đã yêu cầu khi đăng ký.
        //    Nhờ vậy luồng thanh toán/tra cứu theo hộ của cư dân mới hoạt động được.
        linkHouseholdByRequestedApartment(user);

        // 4. Duyệt tài khoản
        user.setActive(true);

        // 5. Lưu thay đổi
        return userRepo.saveAndFlush(user);
    }

    /**
     * Từ chối tài khoản đăng ký: Xóa hoàn toàn khỏi database.
     * Chỉ áp dụng cho tài khoản chưa được duyệt (active = false).
     */
    @LogAdminAction(entity = "User", action = "DELETE", description = "Từ chối & xóa tài khoản chờ duyệt")
    @Transactional
    public void rejectPendingAccount(Long id) {
        // 1. Tìm tài khoản theo ID
        User user = userRepo.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy tài khoản với ID: " + id));

        // 2. Chặn việc xóa nhầm tài khoản đang hoạt động
        if (user.isActive()) {
            throw new IllegalArgumentException("Tài khoản này đã được duyệt và đang hoạt động, KHÔNG THỂ xóa bằng chức năng này!");
        }

        // 3. (Tùy chọn) Nếu bạn muốn gửi email báo cho cư dân biết họ bị từ chối
        emailService.sendRejectionEmail(user.getEmail());

        // 4. Xóa tài khoản khỏi Database
        userRepo.delete(user);
        AuditContext.detail("Từ chối & xóa tài khoản chờ duyệt: " + user.getUsername());
    }

    /**
     * Tìm căn hộ theo requestedApartmentCode → lấy hộ dân ACTIVE đang ở căn hộ đó → gán vào user.
     * Ném lỗi rõ ràng nếu không xác định được hộ, để Admin xử lý thay vì duyệt một tài khoản "mồ côi hộ".
     */
    private void linkHouseholdByRequestedApartment(User user) {
        String code = user.getRequestedApartmentCode();
        if (code == null || code.isBlank()) {
            throw new IllegalArgumentException(
                    "Tài khoản chưa khai báo mã căn hộ. Không thể gán hộ dân khi duyệt.");
        }

        Apartment apartment = apartmentRepo.findByCode(code.trim())
                .orElseThrow(() -> new IllegalArgumentException(
                        "Không tìm thấy căn hộ với mã '" + code + "'."));

        Household household = householdRepo
                .findByApartmentIdAndStatus(apartment.getId(), HouseholdStatus.ACTIVE)
                .orElseThrow(() -> new IllegalArgumentException(
                        "Căn hộ '" + code + "' chưa có hộ dân đang cư trú (ACTIVE). "
                                + "Hãy gán hộ vào căn hộ trước khi duyệt tài khoản."));

        user.setHousehold(household);
    }

    // Admin chỉnh sửa thông tin đăng ký của cư dân khi phát hiện điền nhầm (chỉ áp dụng với tài khoản CHƯA duyệt).
    @Transactional
    public UserDTO updatePendingResidentInfo(Long id, AdminUpdateRegisterRequest req) {
        // 1. Tìm tài khoản cư dân theo ID
        User user = userRepo.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy tài khoản với ID: " + id));

        // 2. Ràng buộc: Chỉ cho phép sửa khi tài khoản chưa được kích hoạt (active = false)
        if (user.isActive()) {
            throw new IllegalArgumentException("Tài khoản này đã được kích hoạt từ trước, không thể sửa đổi thông tin đăng ký ban đầu!");
        }

        // 3. Cập nhật các trường thông tin khác nếu có truyền vào
        if (req.fullName() != null && !req.fullName().isBlank()) {
            user.setFullName(req.fullName().trim());
        }

        if (req.phone() != null) {
            user.setPhone(req.phone().trim());
        }

        if (req.requestedApartmentCode() != null && !req.requestedApartmentCode().isBlank()) {
            user.setRequestedApartmentCode(req.requestedApartmentCode().trim());
        }

        // 4. Lưu thay đổi vào cơ sở dữ liệu và chuyển đổi thành DTO trả về cho Frontend
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
        StringBuilder sb = new StringBuilder(10);
        for (int i = 0; i < 10; i++) {
            sb.append(PASSWORD_ALPHABET.charAt(RANDOM.nextInt(PASSWORD_ALPHABET.length())));
        }
        return sb.toString();
    }
}
