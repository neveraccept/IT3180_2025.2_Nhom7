package org.example.backend.service;

import org.example.backend.aspect.LogAdminAction;
import org.example.backend.dto.UserDTO;
import org.example.backend.dto.request.AdminRegisterRequest;
import org.example.backend.dto.request.AdminUpdateRegisterRequest;
import org.example.backend.entity.Apartment;
import org.example.backend.entity.Household;
import org.example.backend.entity.Role;
import org.example.backend.entity.User;
import org.example.backend.entity.enums.HouseholdStatus;
import org.example.backend.repository.*;
import org.example.backend.service.mapper.UserMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
public class UserService {
    private final UserRepository userRepo;
    private final RoleRepository roleRepo;
    private final EmailOtpRepository emailOtpRepo;
    private final ApartmentRepository apartmentRepo;
    private final HouseholdRepository householdRepo;
    private final PasswordEncoder passwordEncoder;
    private final EmailService emailService;
    private final UserMapper userMapper;
    private final HouseholdLifecycleService householdLifecycleService;

    @Autowired
    public UserService(UserRepository userRepo,
                       RoleRepository roleRepo,
                       ApartmentRepository apartmentRepo,
                       HouseholdRepository householdRepo,
                       PasswordEncoder passwordEncoder,
                       EmailOtpRepository emailOtpRepo,
                       EmailService emailService,
                       UserMapper userMapper,
                       HouseholdLifecycleService householdLifecycleService) {
        this.userRepo = userRepo;
        this.roleRepo = roleRepo;
        this.apartmentRepo = apartmentRepo;
        this.householdRepo = householdRepo;
        this.passwordEncoder = passwordEncoder;
        this.emailService = emailService;
        this.emailOtpRepo = emailOtpRepo;
        this.userMapper = userMapper;
        this.householdLifecycleService = householdLifecycleService;
    }

    //Admin tạo tài khoản nội bộ
    @LogAdminAction(entity = "User", action = "CREATE", description = "Tạo tài khoản nội bộ")
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

        // Kiểm tra OTP gửi về mail đã được xác thực chưa (used = true)
        emailOtpRepo.findTopByEmailAndPurposeAndUsedTrueOrderByCreatedAtDesc(req.email(), "REGISTER")
                .orElseThrow(() -> new IllegalArgumentException("Email chưa được xác thực. Vui lòng xác thực mã OTP trước khi đăng ký!"));

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
    @LogAdminAction(entity = "User", action = "UPDATE", description = "Duyệt tài khoản cư dân")
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
     *
     * Đồng bộ 2 chiều: nếu tài khoản đang gắn với một hộ dân ACTIVE thì tự động chuyển hộ đó
     * ra khỏi căn hộ (Household -> MOVED_OUT, nhân khẩu -> MOVED_OUT, căn hộ -> AVAILABLE).
     * forceMoveOut cũng sẽ vô hiệu hóa toàn bộ tài khoản của hộ (bao gồm tài khoản này).
     */
    @LogAdminAction(entity = "User", action = "DELETE", description = "Xóa mềm tài khoản & chuyển hộ dân ra khỏi căn hộ")
    @Transactional
    public void deleteUser(Long id) {
        User user = userRepo.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy tài khoản với ID: " + id));

        if (user.isDeleted()) {
            throw new IllegalArgumentException("Tài khoản này đã bị xóa trước đó!");
        }

        Household household = user.getHousehold();
        if (household != null && household.getStatus() == HouseholdStatus.ACTIVE) {
            // Chuyển hộ ra khỏi căn hộ; thao tác này cũng xóa mềm các tài khoản gắn với hộ.
            householdLifecycleService.forceMoveOut(household.getId());
        }

        // Đảm bảo tài khoản đang xóa luôn ở trạng thái deleted (kể cả khi không thuộc hộ nào).
        user.setDeleted(true);
        user.setActive(false);
        userRepo.saveAndFlush(user);
    }
}
