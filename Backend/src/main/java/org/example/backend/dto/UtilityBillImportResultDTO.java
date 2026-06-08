package org.example.backend.dto;

import java.util.List;

/**
 * Kết quả nhập hoá đơn điện/nước/internet hàng loạt từ file Excel.
 *  - createdCount: số hoá đơn tạo thành công.
 *  - failedCount: số dòng bị bỏ qua do lỗi (sai mã hộ, trùng hoá đơn, thiếu chỉ số...).
 *  - errors: danh sách thông báo lỗi theo từng dòng để admin sửa lại file rồi nhập lại.
 */
public record UtilityBillImportResultDTO(
        int createdCount,
        int failedCount,
        List<String> errors
) {}
