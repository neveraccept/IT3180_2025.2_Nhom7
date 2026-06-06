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
}
