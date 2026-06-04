// ============================================================
//  vnpayApi — Module 5: Thanh toán online qua VNPay
//  Map PaymentVnpayController:
//    RESIDENT  POST /api/payments/vnpay/create-url   body { targetType, targetId }
//    RESIDENT  GET  /api/payments/vnpay/my-history
//    ADMIN     GET  /api/admin/payment-transactions?status=&householdId=&targetType=&fromDate=&toDate=
//    ADMIN     GET  /api/admin/payment-transactions/{id}
//  Luồng: FE gọi create-url -> nhận { paymentUrl, transactionCode } -> window.location.href = paymentUrl.
//  Sau khi thanh toán, VNPay gọi backend return URL, backend verify rồi 302 redirect FE về
//    http://localhost:5173/payment-result?transactionCode=...&status=...
//  (status ∈ SUCCESS | FAILED | CANCELLED | PENDING | INVALID | NOT_FOUND)
//  PaymentTransactionDTO = { id, transactionCode, householdId, householdCode, userId, targetType,
//    targetId, amount, status, vnpayTransactionNo, vnpayResponseCode, vnpayBankCode, vnpayPayDate,
//    paymentUrl, paidAt, createdAt }
// ============================================================
import axiosClient, { callApi } from "./axiosClient";

// targetType hợp lệ theo backend (PaymentTransaction).
export const VNPAY_TARGET = {
  FEE_PAYMENT: "FEE_PAYMENT", // targetId = Payment.id (phiếu nộp phí)
  UTILITY_BILL: "UTILITY_BILL", // targetId = UtilityBill.id (hoá đơn điện/nước/internet)
};

// RESIDENT: tạo giao dịch + URL thanh toán VNPay.
// payload = { targetType, targetId }. Trả về { paymentUrl, transactionCode }.
export const createVnpayUrlAPI = ({ targetType, targetId }) =>
  callApi(axiosClient.post("/api/payments/vnpay/create-url", { targetType, targetId }));

// RESIDENT: lịch sử giao dịch online của hộ mình.
export const listMyVnpayHistoryAPI = ({ page = 0, size = 100, sort = "createdAt,desc" } = {}) =>
  callApi(axiosClient.get("/api/payments/vnpay/my-history", { params: { page, size, sort } }));

// ADMIN: tra cứu toàn bộ giao dịch online (lọc tuỳ chọn).
export const searchVnpayTransactionsAPI = ({
  status,
  householdId,
  targetType,
  fromDate,
  toDate,
  page = 0,
  size = 100,
  sort = "createdAt,desc",
} = {}) => {
  const params = { page, size, sort };
  if (status) params.status = status;
  if (householdId !== undefined && householdId !== null && householdId !== "") params.householdId = householdId;
  if (targetType) params.targetType = targetType;
  if (fromDate) params.fromDate = fromDate; // ISO yyyy-MM-dd
  if (toDate) params.toDate = toDate;
  return callApi(axiosClient.get("/api/admin/payment-transactions", { params }));
};

// ADMIN: chi tiết một giao dịch online.
export const getVnpayTransactionDetailAPI = (id) =>
  callApi(axiosClient.get(`/api/admin/payment-transactions/${id}`));
