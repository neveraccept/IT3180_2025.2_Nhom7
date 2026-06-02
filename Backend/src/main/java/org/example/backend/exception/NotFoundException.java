package org.example.backend.exception;

/**
 * Ném khi tài nguyên không tồn tại → trả 404.
 * `errorCode` giúp frontend phân biệt loại lỗi mà không cần parse message.
 */
public class NotFoundException extends RuntimeException {

    private final String errorCode;

    public NotFoundException(String errorCode, String message) {
        super(message);
        this.errorCode = errorCode;
    }

    public String getErrorCode() {
        return errorCode;
    }
}


