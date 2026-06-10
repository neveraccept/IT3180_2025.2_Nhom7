package org.example.backend.dto.request;

import org.example.backend.entity.enums.Gender;
import org.example.backend.entity.enums.ResidencyStatus;

import java.time.LocalDate;

/**
 * Payload khi Admin DUYỆT (hoặc tạo) tài khoản cư dân.
 *
 * Mục tiêu: mỗi tài khoản cư dân luôn gắn với MỘT nhân khẩu (Resident) thật trong hộ,
 * thay vì chỉ gắn household_id "mồ côi nhân khẩu" như trước.
 *
 * Cách dùng (backend tự quyết theo trạng thái căn hộ user yêu cầu):
 *  - Căn hộ ĐÃ có hộ ACTIVE:
 *      + linkResidentId != null  -> gắn tài khoản vào nhân khẩu sẵn có trong hộ.
 *      + linkResidentId == null  -> tạo nhân khẩu mới (thành viên hộ) từ idCard/dateOfBirth/gender/...
 *  - Căn hộ TRỐNG (chưa có hộ ACTIVE) — Cách A1:
 *      + tạo hộ mới (newHouseholdCode + moveInDate), người này làm CHỦ HỘ,
 *        đồng thời chuyển căn hộ sang OCCUPIED.
 */
public record ApproveAccountRequest(

        // Gắn vào nhân khẩu sẵn có (chỉ áp dụng khi căn hộ đã có hộ ACTIVE).
        Long linkResidentId,

        // ----- Thông tin để TẠO nhân khẩu mới (khi linkResidentId == null) -----
        String idCard,
        LocalDate dateOfBirth,
        Gender gender,
        String relationToHead,
        ResidencyStatus residencyStatus,

        // ----- Dùng khi căn hộ TRỐNG -> tạo hộ mới, người này làm chủ hộ (A1) -----
        String newHouseholdCode,
        LocalDate moveInDate
) {
}
