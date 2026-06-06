package org.example.backend.aspect;

import org.aspectj.lang.JoinPoint;
import org.aspectj.lang.annotation.AfterReturning;
import org.aspectj.lang.annotation.Aspect;
import org.example.backend.service.AuditLogService;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;

import java.util.stream.Collectors;
import java.util.Arrays;

/**
 * Aspect tự động ghi Audit Log cho mọi phương thức Service được gắn @LogAdminAction.
 * Chỉ ghi khi phương thức chạy THÀNH CÔNG (@AfterReturning), tránh log nhầm thao tác lỗi.
 */
@Aspect
@Component
public class AuditAspect {
    private final AuditLogService auditLogService;

    public AuditAspect(AuditLogService auditLogService) {
        this.auditLogService = auditLogService;
    }

    @AfterReturning(pointcut = "@annotation(logAdminAction)", returning = "result")
    public void logAfter(JoinPoint joinPoint, LogAdminAction logAdminAction, Object result) {
        // Mọi sự cố khi ghi log đều phải "nuốt" lại để không phá luồng nghiệp vụ chính.
        try {
            String adminUsername = currentUsername();

            // Gộp mô tả từ annotation + tham số đầu vào để details có ngữ cảnh (vd: id bị xóa).
            String description = logAdminAction.description();
            Object[] args = joinPoint.getArgs();
            String details = (description == null || description.isBlank())
                    ? "Tham số: " + safeArgs(args)
                    : description + " | Tham số: " + safeArgs(args);

            auditLogService.record(
                    adminUsername,
                    logAdminAction.action(),
                    logAdminAction.entity(),
                    details
            );
        } catch (Exception ignored) {
            // Không làm gì: ghi log thất bại không được ảnh hưởng tới kết quả thao tác.
        }
    }

    private String currentUsername() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || auth.getName() == null) {
            return "SYSTEM";
        }
        return auth.getName();
    }

    // Rút gọn tham số an toàn: chỉ in giá trị các kiểu đơn giản (id, chuỗi, số, boolean, enum).
    // Với object phức tạp (vd: request chứa mật khẩu) chỉ in tên kiểu để tránh lộ dữ liệu nhạy cảm.
    private String safeArgs(Object[] args) {
        if (args == null || args.length == 0) {
            return "[]";
        }
        try {
            return Arrays.stream(args)
                    .map(this::describeArg)
                    .collect(Collectors.joining(", ", "[", "]"));
        } catch (Exception ex) {
            return "[không đọc được tham số]";
        }
    }

    private String describeArg(Object arg) {
        if (arg == null) {
            return "null";
        }
        if (arg instanceof Number || arg instanceof Boolean || arg instanceof CharSequence || arg instanceof Enum<?>) {
            return String.valueOf(arg);
        }
        // Không in nội dung object (có thể chứa mật khẩu / dữ liệu lớn) — chỉ ghi tên kiểu.
        return arg.getClass().getSimpleName();
    }
}
