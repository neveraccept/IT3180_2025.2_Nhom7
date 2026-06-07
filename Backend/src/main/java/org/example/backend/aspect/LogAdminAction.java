package org.example.backend.aspect;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * Đánh dấu một phương thức Service là "thao tác quản trị cần ghi nhật ký".
 * AuditAspect sẽ tự bắt các phương thức gắn annotation này và lưu một bản ghi
 * vào bảng audit_logs sau khi phương thức thực thi thành công.
 *
 * Ví dụ:
 *   @LogAdminAction(entity = "User", action = "DELETE", description = "Xóa tài khoản")
 */
@Target(ElementType.METHOD)
@Retention(RetentionPolicy.RUNTIME)
public @interface LogAdminAction {
    /** Đối tượng bị tác động: User, Complaint, FeePeriod... */
    String entity();

    /** Loại hành động: CREATE, UPDATE, DELETE. */
    String action();

    /** Mô tả ngắn gọn (tùy chọn) hiển thị trong nhật ký. */
    String description() default "";

    /**
     * Biểu thức SpEL (tùy chọn) sinh phần "chi tiết" cho nhật ký, nối thêm sau mô tả.
     * Có thể tham chiếu tham số đầu vào theo tên (vd: #id, #dto) và giá trị trả về (#result).
     *
     * Ví dụ: detail = "'Khoản thu: ' + #result.name"
     *
     * Lưu ý: nếu service tự ghi qua {@code AuditContext.detail(...)} thì giá trị đó được ưu tiên.
     */
    String detail() default "";
}
