// ============================================================
//  paymentApi — Module 5: Phiếu nộp phí (Payment, thanh toán tiền mặt + công nợ)
//  Map PaymentController:
//    RESIDENT  GET  /api/payments/my-household
//    ADMIN     GET  /api/admin/payments?householdId=&status=
//    ADMIN     PUT  /api/admin/payments/{id}/confirm-cash
//  PaymentDetailDTO = { id, feePeriodId, feePeriodName, feeName, householdId, householdCode,
//    amountDue, amountPaid, paidDate, status(UNPAID|PAID), paymentMethod, transactionCode,
//    paidAt, note, collectedByName }
// ============================================================
import axiosClient, { callApi } from "./axiosClient";

// RESIDENT: phiếu nộp của hộ mình (householdId lấy từ JWT ở backend).
export const listMyHouseholdPaymentsAPI = ({ page = 0, size = 100, sort = "id,desc" } = {}) =>
  callApi(axiosClient.get("/api/payments/my-household", { params: { page, size, sort } }));

// ADMIN: danh sách / lọc phiếu nộp theo householdId, status, tên khoản thu (keyword).
// Mặc định sắp xếp theo hộ (household.id) để gom các phiếu cùng hộ liền nhau.
export const listAdminPaymentsAPI = ({ householdId, status, keyword, page = 0, size = 100, sort = "household.id,asc" } = {}) => {
  const params = { page, size, sort };
  if (householdId !== undefined && householdId !== null && householdId !== "") params.householdId = householdId;
  if (status) params.status = status;
  if (keyword !== undefined && keyword !== null && String(keyword).trim() !== "") params.keyword = String(keyword).trim();
  return callApi(axiosClient.get("/api/admin/payments", { params }));
};

// ADMIN: xác nhận đã nộp đủ tiền mặt cho một phiếu nộp.
// amount (tuỳ chọn): chỉ dùng cho khoản TỰ NGUYỆN (DONATION) — số tiền hộ đóng góp.
export const confirmCashPaymentAPI = (id, amount) =>
  callApi(axiosClient.put(
    `/api/admin/payments/${id}/confirm-cash`,
    amount != null && amount !== "" ? { amount: Number(amount) } : undefined
  ));

// ADMIN: xác nhận tiền mặt hàng loạt. Gọi tuần tự endpoint đơn lẻ cho từng phiếu
// (mỗi phiếu vẫn sinh một bản ghi nhật ký riêng). Trả về { ok, failed, errors }.
// Lưu ý: khoản tự nguyện cần nhập số tiền nên không xác nhận hàng loạt được — xử lý riêng từng phiếu.
export const confirmCashPaymentsBatchAPI = async (ids = []) => {
  let ok = 0;
  const errors = [];
  for (const id of ids) {
    const res = await confirmCashPaymentAPI(id);
    if (res.success) ok += 1;
    else errors.push({ id, message: res.message });
  }
  return { ok, failed: errors.length, errors };
};
