import axiosClient, { callApi } from "./axiosClient";

export const VNPAY_TARGET = {
  FEE_PAYMENT: "FEE_PAYMENT",
  FEE_PAYMENT_BATCH: "FEE_PAYMENT_BATCH",
  MIXED_PAYMENT_BATCH: "MIXED_PAYMENT_BATCH",
  UTILITY_BILL: "UTILITY_BILL",
};

export const createVnpayUrlAPI = ({ targetType, targetId, customAmount, targetIds, utilityBillIds, customAmounts }) =>
  callApi(axiosClient.post("/api/payments/vnpay/create-url", { targetType, targetId, customAmount, targetIds, utilityBillIds, customAmounts }));

export const listMyVnpayHistoryAPI = ({ page = 0, size = 100, sort = "createdAt,desc" } = {}) =>
  callApi(axiosClient.get("/api/payments/vnpay/my-history", { params: { page, size, sort } }));

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
  if (fromDate) params.fromDate = fromDate;
  if (toDate) params.toDate = toDate;
  return callApi(axiosClient.get("/api/admin/payment-transactions", { params }));
};

export const getVnpayTransactionDetailAPI = (id) =>
  callApi(axiosClient.get(`/api/admin/payment-transactions/${id}`));
