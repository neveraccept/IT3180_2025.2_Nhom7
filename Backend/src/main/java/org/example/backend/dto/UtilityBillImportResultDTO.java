package org.example.backend.dto;

import java.util.List;

/**
 * Kết quả nhập hoá đơn điện/nước/internet hàng loạt từ file Excel.
 *  - createdCount: số hoá đơn tạo thành công.
 *  - failedCount: số dòng bị lỗi (trùng hoá đơn, thiếu chỉ số, loại sai...).
 *  - skippedCount: số dòng được BỎ QUA vì mã hộ không tồn tại trong hệ thống (không tính là lỗi).
 *  - errors: danh sách thông báo lỗi theo từng dòng để admin sửa lại file rồi nhập lại.
 */
public record UtilityBillImportResultDTO(
        int createdCount,
        int failedCount,
        int skippedCount,
        List<String> errors
) {}
