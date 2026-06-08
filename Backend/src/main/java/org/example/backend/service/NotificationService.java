package org.example.backend.service;

import org.example.backend.dto.NotificationDTO;
import org.example.backend.dto.response.PageResponse;
import org.example.backend.dto.request.NotificationCreateRequest;
import org.example.backend.entity.Notification;
import org.example.backend.entity.NotificationRecipient;
import org.example.backend.entity.User;
import org.example.backend.entity.enums.NotificationScope;
import org.example.backend.exception.BadRequestException;
import org.example.backend.exception.NotFoundException;
import org.example.backend.repository.NotificationRecipientRepository;
import org.example.backend.repository.NotificationRepository;
import org.example.backend.repository.UserRepository;
import org.example.backend.security.CurrentUserService;
import org.example.backend.service.mapper.NotificationMapper;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Service
public class NotificationService {

    private final NotificationRepository notificationRepository;
    private final NotificationRecipientRepository recipientRepository;
    private final UserRepository userRepository;
    private final NotificationMapper mapper;
    private final CurrentUserService currentUserService;

    public NotificationService(NotificationRepository notificationRepository,
                               NotificationRecipientRepository recipientRepository,
                               UserRepository userRepository,
                               NotificationMapper mapper,
                               CurrentUserService currentUserService) {
        this.notificationRepository = notificationRepository;
        this.recipientRepository = recipientRepository;
        this.userRepository = userRepository;
        this.mapper = mapper;
        this.currentUserService = currentUserService;
    }

    // F9.1 + F9.2 - Admin soạn, chọn phạm vi và gửi thông báo

    @Transactional
    public NotificationDTO create(NotificationCreateRequest req) {
        User admin = currentUserService.getCurrentUser();

        // Resolve danh sách người nhận theo phạm vi
        List<User> recipients = resolveRecipients(req);
        if (recipients.isEmpty()) {
            throw new BadRequestException(
                    "NO_RECIPIENTS",
                    "Không có người nhận nào phù hợp với phạm vi đã chọn.");
        }

        Notification n = new Notification();
        n.setTitle(req.title().trim());
        n.setContent(req.content());
        n.setScope(req.scope());
        n.setSender(admin);
        Notification savedNoti = notificationRepository.save(n);

        // Sinh các bản ghi notification_recipients
        List<NotificationRecipient> rows = new ArrayList<>(recipients.size());
        for (User u : recipients) {
            NotificationRecipient nr = new NotificationRecipient();
            nr.setNotification(savedNoti);
            nr.setRecipient(u);
            nr.setIsRead(false);
            rows.add(nr);
        }
        recipientRepository.saveAll(rows);

        return mapper.toSentDto(savedNoti, rows.size());
    }

    // F9.3 - Cư dân/Admin xem thông báo gửi cho mình (filter theo recipient_id)

    @Transactional(readOnly = true)
    public PageResponse<NotificationDTO> getMyNotifications(Pageable pageable) {
        User me = currentUserService.getCurrentUser();
        Page<NotificationDTO> page = recipientRepository
                .findByRecipientId(me.getId(), pageable)
                .map(mapper::toRecipientDto);
        return PageResponse.of(page);
    }

    // F9.1 (xem lại) - Admin xem danh sách thông báo mình đã gửi (kèm số người nhận)

    @Transactional(readOnly = true)
    public PageResponse<NotificationDTO> getSentNotifications(Pageable pageable) {
        User me = currentUserService.getCurrentUser();
        Page<NotificationDTO> page = notificationRepository
                .findBySenderId(me.getId(), pageable)
                .map(n -> mapper.toSentDto(
                        n, (int) recipientRepository.countByNotificationId(n.getId())));
        return PageResponse.of(page);
    }

    // F9.4 - Đánh dấu thông báo đã đọc

    @Transactional
    public NotificationDTO markAsRead(Long notificationId) {
        User me = currentUserService.getCurrentUser();

        NotificationRecipient nr = findMyRecipient(notificationId, me.getId());

        if (Boolean.FALSE.equals(nr.getIsRead())) {
            nr.setIsRead(true);
            nr.setReadAt(LocalDateTime.now());
            recipientRepository.save(nr);
        }
        return mapper.toRecipientDto(nr);
    }

    @Transactional
    public NotificationDTO markAsUnread(Long notificationId) {
        User me = currentUserService.getCurrentUser();
        NotificationRecipient nr = findMyRecipient(notificationId, me.getId());

        if (Boolean.TRUE.equals(nr.getIsRead())) {
            nr.setIsRead(false);
            nr.setReadAt(null);
            recipientRepository.save(nr);
        }
        return mapper.toRecipientDto(nr);
    }

    // Helpers

    private NotificationRecipient findMyRecipient(Long notificationId, Long userId) {
        return recipientRepository
                .findByNotificationIdAndRecipientId(notificationId, userId)
                .orElseThrow(() -> new NotFoundException(
                        "NOTIFICATION_NOT_FOUND",
                        "Không tìm thấy thông báo gửi cho bạn id=" + notificationId));
    }

    /** Quy đổi phạm vi (ALL / BY_FLOOR / BY_HOUSEHOLD) thành danh sách cư dân nhận. */
    private List<User> resolveRecipients(NotificationCreateRequest req) {
        return switch (req.scope()) {
            case ALL -> userRepository.findActiveResidents();

            case BY_FLOOR -> {
                if (req.floors() == null || req.floors().isEmpty()) {
                    throw new BadRequestException(
                            "FLOORS_REQUIRED",
                            "Phạm vi BY_FLOOR cần ít nhất một tầng.");
                }
                yield userRepository.findActiveResidentsByFloors(req.floors());
            }

            case BY_HOUSEHOLD -> {
                if (req.householdIds() == null || req.householdIds().isEmpty()) {
                    throw new BadRequestException(
                            "HOUSEHOLDS_REQUIRED",
                            "Phạm vi BY_HOUSEHOLD cần ít nhất một hộ.");
                }
                yield userRepository.findActiveResidentsByHouseholdIds(req.householdIds());
            }
        };
    }
}
