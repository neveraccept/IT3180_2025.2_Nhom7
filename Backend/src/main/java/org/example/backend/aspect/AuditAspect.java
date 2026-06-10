package org.example.backend.aspect;

import org.aspectj.lang.JoinPoint;
import org.aspectj.lang.annotation.AfterReturning;
import org.aspectj.lang.annotation.Aspect;
import org.aspectj.lang.reflect.MethodSignature;
import org.example.backend.service.AuditLogService;
import org.springframework.core.DefaultParameterNameDiscoverer;
import org.springframework.core.ParameterNameDiscoverer;
import org.springframework.expression.ExpressionParser;
import org.springframework.expression.spel.standard.SpelExpressionParser;
import org.springframework.expression.spel.support.StandardEvaluationContext;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;

import java.lang.reflect.Method;

/**
 * Aspect tự động ghi Audit Log cho mọi phương thức Service được gắn @LogAdminAction.
 * Chỉ ghi khi phương thức chạy THÀNH CÔNG (@AfterReturning), tránh log nhầm thao tác lỗi.
 *
 * Phần "chi tiết" được lấy theo thứ tự ưu tiên:
 *   1. {@link AuditContext} – service tự ghi (chính xác nhất: có cả tên thực thể).
 *   2. Biểu thức SpEL trong {@code detail()} – tham chiếu tham số (#id, #dto...) và #result.
 *   3. Nếu không có cả hai – chỉ ghi mô tả tĩnh trong {@code description()}.
 */
@Aspect
@Component
public class AuditAspect {
    private final AuditLogService auditLogService;
    private final ExpressionParser expressionParser = new SpelExpressionParser();
    private final ParameterNameDiscoverer parameterNameDiscoverer = new DefaultParameterNameDiscoverer();

    public AuditAspect(AuditLogService auditLogService) {
        this.auditLogService = auditLogService;
    }

    @AfterReturning(pointcut = "@annotation(logAdminAction)", returning = "result")
    public void logAfter(JoinPoint joinPoint, LogAdminAction logAdminAction, Object result) {
        // Chỉ ghi nhật ký cho thao tác do Admin (người dùng đã đăng nhập) thực hiện.
        // Thao tác do hệ thống tự chạy (job nền, callback VNPay, seed dữ liệu...) không có
        // người dùng trong SecurityContext -> bỏ qua, KHÔNG lưu bản ghi "SYSTEM".
        String username = currentUsername();
        if (username == null) {
            AuditContext.clear();
            return;
        }

        // Mọi sự cố khi ghi log đều phải "nuốt" lại để không phá luồng nghiệp vụ chính.
        try {
            String description = logAdminAction.description();
            String detail = resolveDetail(joinPoint, logAdminAction, result);

            String details;
            if (detail == null || detail.isBlank()) {
                details = description;
            } else if (description == null || description.isBlank()) {
                details = detail;
            } else {
                details = description + " — " + detail;
            }

            auditLogService.record(
                    username,
                    logAdminAction.action(),
                    logAdminAction.entity(),
                    details
            );
        } catch (Exception ignored) {
            // Không làm gì: ghi log thất bại không được ảnh hưởng tới kết quả thao tác.
        } finally {
            // Luôn dọn context để không sót chi tiết sang thao tác kế tiếp trên cùng luồng.
            AuditContext.clear();
        }
    }

    /**
     * Lấy phần chi tiết: ưu tiên giá trị service tự ghi qua AuditContext; nếu không có,
     * thử suy ra từ biểu thức SpEL trong annotation (tham chiếu tham số theo tên và #result).
     */
    private String resolveDetail(JoinPoint joinPoint, LogAdminAction logAdminAction, Object result) {
        String contextDetail = AuditContext.consume();
        if (contextDetail != null && !contextDetail.isBlank()) {
            return contextDetail;
        }

        String expression = logAdminAction.detail();
        if (expression == null || expression.isBlank()) {
            return null;
        }

        try {
            MethodSignature signature = (MethodSignature) joinPoint.getSignature();
            Method method = signature.getMethod();

            StandardEvaluationContext context = new StandardEvaluationContext();
            Object[] args = joinPoint.getArgs();
            String[] names = parameterNameDiscoverer.getParameterNames(method);
            if (names != null) {
                for (int i = 0; i < names.length && i < args.length; i++) {
                    context.setVariable(names[i], args[i]);
                }
            }
            context.setVariable("result", result);

            Object value = expressionParser.parseExpression(expression).getValue(context);
            return value == null ? null : String.valueOf(value);
        } catch (Exception ex) {
            // Biểu thức lỗi không được làm hỏng việc ghi log -> bỏ qua phần chi tiết.
            return null;
        }
    }

    /**
     * Trả về username của Admin đang đăng nhập, hoặc {@code null} nếu thao tác do hệ thống
     * tự thực hiện (chưa xác thực / ẩn danh) — khi đó aspect sẽ không ghi nhật ký.
     */
    private String currentUsername() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated()
                || auth instanceof org.springframework.security.authentication.AnonymousAuthenticationToken) {
            return null;
        }
        String name = auth.getName();
        if (name == null || name.isBlank() || "anonymousUser".equals(name)) {
            return null;
        }
        return name;
    }
}
