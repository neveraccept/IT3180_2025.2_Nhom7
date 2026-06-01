package org.example.backend.exception;

/**
 * Ném khi dữ liệu / nghiệp vụ không hợp lệ → trả 400.
 * Dùng cho các luật nghiệp vụ M2:
 *   - Mã hộ trùng.
 *   - Apartment đang MAINTENANCE không nhận hộ mới.
 *   - Apartment đã có Household ACTIVE → không gán thêm.
 *   - Apartment trống → không có gì để chuyển hộ.
 *   - Chủ hộ chỉ định không thuộc hộ / không còn ACTIVE.
 *   - Cố sửa code apartment (không cho phép).
 */
public class BadRequestException extends RuntimeException {

    private final String errorCode;

    public BadRequestException(String errorCode, String message) {
        super(message);
        this.errorCode = errorCode;
    }

    public String getErrorCode() {
        return errorCode;
    }
}


