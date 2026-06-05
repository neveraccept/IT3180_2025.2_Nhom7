// ============================================================
//  utilityApi — Module 7: Hoá đơn điện/nước/internet (UtilityBill)
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

// ADMIN: nhập hoá đơn. payload = { householdId, type, month, year, amount }
export const createUtilityBillAPI = (payload) =>
  callApi(axiosClient.post("/api/utility-bills", payload));

// ADMIN: sửa hoá đơn (chỉ khi UNPAID). payload = { type?, month?, year?, amount? } (null = giữ nguyên)
export const updateUtilityBillAPI = (id, payload) =>
  callApi(axiosClient.put(`/api/utility-bills/${id}`, payload));

// ADMIN: xoá hoá đơn.
export const deleteUtilityBillAPI = (id) => callApi(axiosClient.delete(`/api/utility-bills/${id}`));

// ADMIN: ghi nhận đã nộp tiền mặt.
export const confirmCashUtilityBillAPI = (id) =>
  callApi(axiosClient.put(`/api/admin/utility-bills/${id}/confirm-cash`));

// ADMIN: tra cứu hoá đơn (lọc theo hộ/loại/tháng/năm/trạng thái). Bỏ qua tham số rỗng.
export const searchUtilityBillsAPI = ({
  householdId,
  type,
  month,
  year,
  status,
  page = 0,
  size = 100,
  sort = "year,desc",
} = {}) => {
  const params = { page, size, sort };
  if (householdId !== undefined && householdId !== null && householdId !== "") params.householdId = householdId;
  if (type) params.type = type;
  if (month) params.month = month;
  if (year) params.year = year;
  if (status) params.status = status;
  return callApi(axiosClient.get("/api/utility-bills", { params }));
};

// ADMIN: chi tiết hoá đơn.
export const getUtilityBillDetailAPI = (id) => callApi(axiosClient.get(`/api/utility-bills/${id}`));

// RESIDENT: hoá đơn của hộ mình (lọc tuỳ chọn).
export const listMyUtilityBillsAPI = ({ type, month, year, status, page = 0, size = 100, sort = "year,desc" } = {}) => {
  const params = { page, size, sort };
  if (type) params.type = type;
  if (month) params.month = month;
  if (year) params.year = year;
  if (status) params.status = status;
  return callApi(axiosClient.get("/api/utility-bills/my-household", { params }));
};
