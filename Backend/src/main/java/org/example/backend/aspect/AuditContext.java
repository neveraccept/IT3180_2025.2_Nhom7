package org.example.backend.aspect;

/**
 * Kênh phụ để service tự ghi phần "chi tiết" chính xác cho Audit Log
 * (vd: mã hộ, tên khoản thu, biển số xe...) mà chỉ biết được bên trong thân phương thức.
 *
 * AuditAspect sẽ ưu tiên lấy chi tiết này (nếu có) rồi xóa đi ngay sau khi ghi log,
 * tránh rò rỉ sang thao tác kế tiếp trên cùng luồng.
 */
public final class AuditContext {

    private static final ThreadLocal<String> DETAIL = new ThreadLocal<>();

    private AuditContext() {
    }

    public static void detail(String text) {
        if (text != null && !text.isBlank()) {
            DETAIL.set(text);
        }
    }

    /** Lấy chi tiết đã ghi và xóa khỏi luồng (chỉ dùng nội bộ aspect). */
    public static String consume() {
        String value = DETAIL.get();
        DETAIL.remove();
        return value;
    }

    /** Dọn sạch để chắc chắn không sót dữ liệu sang thao tác sau. */
    public static void clear() {
        DETAIL.remove();
    }
}
