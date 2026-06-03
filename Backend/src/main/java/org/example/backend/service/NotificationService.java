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
    private final AuditLogService auditLogService;

    public NotificationService(NotificationRepository notificationRepository,
                               NotificationRecipientRepository recipientRepository,
                               UserRepository userRepository,
                               NotificationMapper mapper,
                               CurrentUserService currentUserService,
                               AuditLogService auditLogService) {
        this.notificationRepository = notificationRepository;
        this.recipientRepository = recipientRepository;
        this.userRepository = userRepository;
        this.mapper = mapper;
        this.currentUserService = currentUserService;
        this.auditLogService = auditLogService;
    }

    // F9.1 + F9.2 â€“ Admin soáº¡n, chá»n pháº¡m vi vÃ  gá»­i thÃ´ng bÃ¡o

    @Transactional
    public NotificationDTO create(NotificationCreateRequest req) {
        User admin = currentUserService.getCurrentUser();

        // Resolve danh sÃ¡ch ngÆ°á»i nháº­n theo pháº¡m vi
        List<User> recipients = resolveRecipients(req);
        if (recipients.isEmpty()) {
            throw new BadRequestException(
                    "NO_RECIPIENTS",
                    "KhÃ´ng cÃ³ ngÆ°á»i nháº­n nÃ o khá»›p vá»›i pháº¡m vi Ä‘Ã£ chá»n.");
        }

        Notification n = new Notification();
        n.setTitle(req.title().trim());
        n.setContent(req.content());
        n.setScope(req.scope());
        n.setSender(admin);
        Notification savedNoti = notificationRepository.save(n);

        // Sinh cÃ¡c báº£n ghi notification_recipients
        List<NotificationRecipient> rows = new ArrayList<>(recipients.size());
        for (User u : recipients) {
            NotificationRecipient nr = new NotificationRecipient();
            nr.setNotification(savedNoti);
            nr.setRecipient(u);
            nr.setIsRead(false);
            rows.add(nr);
        }
        recipientRepository.saveAll(rows);

        auditLogService.log("NOTIFICATION_SEND", "NOTIFICATION", savedNoti.getId(),
                "Admin " + admin.getFullName() + " gá»­i thÃ´ng bÃ¡o \"" + savedNoti.getTitle()
                        + "\" (scope=" + savedNoti.getScope() + ", " + rows.size() + " ngÆ°á»i nháº­n)");

        return mapper.toSentDto(savedNoti, rows.size());
    }

    // F9.3 â€“ CÆ° dÃ¢n/Admin xem thÃ´ng bÃ¡o gá»­i cho mÃ¬nh (filter theo recipient_id)

    @Transactional(readOnly = true)
    public PageResponse<NotificationDTO> getMyNotifications(Pageable pageable) {
        User me = currentUserService.getCurrentUser();
        Page<NotificationDTO> page = recipientRepository
                .findByRecipientId(me.getId(), pageable)
                .map(mapper::toRecipientDto);
        return PageResponse.of(page);
    }

    // F9.4 â€“ ÄÃ¡nh dáº¥u thÃ´ng bÃ¡o Ä‘Ã£ Ä‘á»c

    @Transactional
    public NotificationDTO markAsRead(Long notificationId) {
        User me = currentUserService.getCurrentUser();

        // Chá»‰ tÃ¬m trong cÃ¡c báº£n ghi nháº­n cá»§a chÃ­nh user â†’ user khÃ¡c khÃ´ng Ä‘Ã¡nh dáº¥u há»™ Ä‘Æ°á»£c
        NotificationRecipient nr = recipientRepository
                .findByNotificationIdAndRecipientId(notificationId, me.getId())
                .orElseThrow(() -> new NotFoundException(
                        "NOTIFICATION_NOT_FOUND",
                        "KhÃ´ng tÃ¬m tháº¥y thÃ´ng bÃ¡o gá»­i cho báº¡n id=" + notificationId));

        if (Boolean.FALSE.equals(nr.getIsRead())) {
            nr.setIsRead(true);
            nr.setReadAt(LocalDateTime.now());
            recipientRepository.save(nr);

            auditLogService.log("NOTIFICATION_READ", "NOTIFICATION", notificationId,
                    "User " + me.getFullName() + " Ä‘Ã£ Ä‘á»c thÃ´ng bÃ¡o #" + notificationId);
        }
        return mapper.toRecipientDto(nr);
    }

    // Helpers

    /** Quy Ä‘á»•i pháº¡m vi (ALL / BY_FLOOR / BY_HOUSEHOLD) thÃ nh danh sÃ¡ch cÆ° dÃ¢n nháº­n. */
    private List<User> resolveRecipients(NotificationCreateRequest req) {
        return switch (req.scope()) {
            case ALL -> userRepository.findActiveResidents();

            case BY_FLOOR -> {
                if (req.floors() == null || req.floors().isEmpty()) {
                    throw new BadRequestException(
                            "FLOORS_REQUIRED",
                            "Pháº¡m vi BY_FLOOR cáº§n Ã­t nháº¥t má»™t táº§ng.");
                }
                yield userRepository.findActiveResidentsByFloors(req.floors());
            }

            case BY_HOUSEHOLD -> {
                if (req.householdIds() == null || req.householdIds().isEmpty()) {
                    throw new BadRequestException(
                            "HOUSEHOLDS_REQUIRED",
                            "Pháº¡m vi BY_HOUSEHOLD cáº§n Ã­t nháº¥t má»™t há»™.");
                }
                yield userRepository.findActiveResidentsByHouseholdIds(req.householdIds());
            }
        };
    }
}