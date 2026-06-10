// ============================================================
//  utilityApi — Module 7: Hóa đơn điện/nước/internet (UtilityBill)
//  Map UtilityBillController (/api):
//    ADMIN     POST   /api/utility-bills                 body CreateUtilityBillRequest
//    ADMIN     PUT    /api/utility-bills/{id}            body UpdateUtilityBillRequest
//    ADMIN     DELETE /api/utility-bills/{id}
//    ADMIN     PUT    /api/admin/utility-bills/{id}/confirm-cash
//    ADMIN     GET    /api/utility-bills?householdId=&type=&month=&year=&status=
//    ADMIN     GET    /api/utility-bills/{id}
//    RESIDENT  GET    /api/utility-bills/my-household?type=&month=&year=&status=
//  Enum backend: UtilityType = ELECTRICITY | WATER | INTERNET.
//                UtilityBillStatus = UNPAID | PAID.
//  UtilityBillDTO = { id, householdId, householdCode, type, month, year, amount, status,
//    paidDate, paymentMethod, transactionCode, paidAt }
//  LƯU Ý: backend lưu trực tiếp `amount` (không có chỉ số cũ/mới hay đơn giá).
// ============================================================
import axiosClient, { callApi } from "./axiosClient";

export const UTILITY_TYPE = { ELECTRICITY: "ELECTRICITY", WATER: "WATER", INTERNET: "INTERNET" };
export const UTILITY_STATUS = { UNPAID: "UNPAID", PAID: "PAID" };

// ADMIN: nhập hóa đơn. payload = { householdId, type, month, year, amount }
export const createUtilityBillAPI = (payload) =>
  callApi(axiosClient.post("/api/utility-bills", payload));

// ADMIN: sửa hóa đơn (chỉ khi UNPAID). payload = { type?, month?, year?, amount? } (null = giữ nguyên)
export const updateUtilityBillAPI = (id, payload) =>
  callApi(axiosClient.put(`/api/utility-bills/${id}`, payload));

// ADMIN: xoá hóa đơn.
export const deleteUtilityBillAPI = (id) => callApi(axiosClient.delete(`/api/utility-bills/${id}`));

// ADMIN: ghi nhận đã nộp tiền mặt.
export const confirmCashUtilityBillAPI = (id) =>
  callApi(axiosClient.put(`/api/admin/utility-bills/${id}/confirm-cash`));

// ADMIN: xác nhận tiền mặt hàng loạt cho nhiều hóa đơn cùng lúc.
// Gọi tuần tự endpoint đơn lẻ cho từng hóa đơn (mỗi hóa đơn vẫn sinh một bản ghi nhật ký riêng).
// Trả về { ok, failed, errors }.
export const confirmCashUtilityBillsBatchAPI = async (ids = []) => {
  let ok = 0;
  const errors = [];
  for (const id of ids) {
    const res = await confirmCashUtilityBillAPI(id);
    if (res.success) ok += 1;
    else errors.push({ id, message: res.message });
  }
  return { ok, failed: errors.length, errors };
};

// ADMIN: tra cứu hóa đơn (lọc theo hộ/loại/tháng/năm/trạng thái). Bỏ qua tham số rỗng.
export const searchUtilityBillsAPI = ({
  householdId,
  type,
  month,
  year,
  status,
  page = 0,
  size = 100,
  // Mặc định gom theo hộ (household.id) để Admin dễ tra cứu hóa đơn của từng hộ.
  sort = "household.id,asc",
} = {}) => {
  const params = { page, size, sort };
  if (householdId !== undefined && householdId !== null && householdId !== "") params.householdId = householdId;
  if (type) params.type = type;
  if (month) params.month = month;
  if (year) params.year = year;
  if (status) params.status = status;
  return callApi(axiosClient.get("/api/utility-bills", { params }));
};

// ADMIN: chi tiết hóa đơn.
export const getUtilityBillDetailAPI = (id) => callApi(axiosClient.get(`/api/utility-bills/${id}`));

// ADMIN: nhập hóa đơn hàng loạt từ file Excel (.xlsx). Trả về { createdCount, failedCount, errors }.
export const importUtilityBillsExcelAPI = (file) => {
  const form = new FormData();
  form.append("file", file);
  return callApi(
    axiosClient.post("/api/utility-bills/import", form, {
      headers: { "Content-Type": "multipart/form-data" },
    })
  );
};

// ADMIN: tải file Excel mẫu để nhập hàng loạt (responseType: 'blob').
export const downloadUtilityImportTemplateAPI = () =>
  callApi(axiosClient.get("/api/utility-bills/import-template", { responseType: "blob" }));

// ADMIN: sinh hóa đơn phí điện nước cho từng hộ theo tháng (gắn vào hệ thống Thu phí).
// payload = { month, year } -> { feePeriodId, feePeriodName, invoiceCount, totalAmount }
export const generateUtilityFeesAPI = ({ month, year }) =>
  callApi(axiosClient.post("/api/admin/utility-fees/generate", { month: Number(month), year: Number(year) }));

// RESIDENT: hóa đơn của hộ mình (lọc tuỳ chọn).
export const listMyUtilityBillsAPI = ({ type, month, year, status, page = 0, size = 100, sort = "year,desc" } = {}) => {
  const params = { page, size, sort };
  if (type) params.type = type;
  if (month) params.month = month;
  if (year) params.year = year;
  if (status) params.status = status;
  return callApi(axiosClient.get("/api/utility-bills/my-household", { params }));
};
