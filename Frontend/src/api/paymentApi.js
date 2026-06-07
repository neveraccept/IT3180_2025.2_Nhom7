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

// ADMIN: danh sách / lọc phiếu nộp theo householdId, status.
export const listAdminPaymentsAPI = ({ householdId, status, page = 0, size = 100, sort = "id,desc" } = {}) => {
  const params = { page, size, sort };
  if (householdId !== undefined && householdId !== null && householdId !== "") params.householdId = householdId;
  if (status) params.status = status;
  return callApi(axiosClient.get("/api/admin/payments", { params }));
};

// ADMIN: xác nhận đã nộp đủ tiền mặt cho một phiếu nộp.
export const confirmCashPaymentAPI = (id) =>
  callApi(axiosClient.put(`/api/admin/payments/${id}/confirm-cash`));
