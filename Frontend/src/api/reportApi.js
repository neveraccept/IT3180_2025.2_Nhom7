// ============================================================
//  reportApi — Module 10: Thống kê & xuất báo cáo
//  Nguồn sự thật: ReportController /api/reports (ADMIN only)
//  - Stats endpoints trả JSON bọc trong ApiResponse → dùng callApi()
//  - Export endpoints trả byte[] (Excel/PDF) → dùng callApi() với
//    responseType: 'blob'; callApi nhận Blob vì Blob không có prop "data"
//    nên hasEnvelope=false, result.data = Blob trực tiếp.
// ============================================================
import axiosClient, { callApi } from "./axiosClient";

// Trigger trình duyệt tải file từ Blob.
export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ============================================================
//  Thống kê (JSON)
// ============================================================

// Bộ lọc thời gian (from/to dạng YYYY-MM-DD) là tuỳ chọn; bỏ qua khi rỗng.
const dateParams = ({ from, to } = {}) => {
  const params = {};
  if (from) params.from = from;
  if (to) params.to = to;
  return params;
};

// Gộp danh sách id đợt thu thành chuỗi "1,2,3" để Spring bind vào List<Long> feePeriodIds.
const joinIds = (ids) =>
  (Array.isArray(ids) ? ids : [ids]).filter((v) => v !== "" && v != null).join(",");

// F10.1 - Thống kê MỘT hoặc NHIỀU đợt thu cùng lúc (feePeriodIds là mảng id).
export const getFeePeriodStatisticsAPI = (feePeriodIds, range = {}) =>
  callApi(
    axiosClient.get("/api/reports/fee-periods/statistics", {
      params: { feePeriodIds: joinIds(feePeriodIds), ...dateParams(range) },
    })
  );

// F10.2 - Thống kê khoản đóng góp tự nguyện theo KHOẢN THU (feeId).
export const getDonationStatisticsAPI = (feeId) =>
  callApi(axiosClient.get(`/api/reports/donations/${feeId}/statistics`));

export const getHouseholdStatisticsAPI = (range = {}) =>
  callApi(axiosClient.get("/api/reports/households/statistics", { params: dateParams(range) }));

export const getResidentStatisticsAPI = (range = {}) =>
  callApi(axiosClient.get("/api/reports/residents/statistics", { params: dateParams(range) }));

// ============================================================
//  Xuất Excel (responseType: 'blob')
// ============================================================

export const exportFeePeriodExcelAPI = (feePeriodIds) =>
  callApi(
    axiosClient.get("/api/reports/fee-periods/excel", {
      responseType: "blob",
      params: { feePeriodIds: joinIds(feePeriodIds) },
    })
  );

export const exportDonationExcelAPI = (feeId) =>
  callApi(axiosClient.get(`/api/reports/donations/${feeId}/excel`, { responseType: "blob" }));

export const exportHouseholdExcelAPI = () =>
  callApi(axiosClient.get("/api/reports/households/excel", { responseType: "blob" }));

export const exportResidentExcelAPI = () =>
  callApi(axiosClient.get("/api/reports/residents/excel", { responseType: "blob" }));

export const exportTransactionExcelAPI = ({ status, from, to } = {}) => {
  const params = {};
  if (status) params.status = status;
  if (from) params.from = from;
  if (to) params.to = to;
  return callApi(
    axiosClient.get("/api/reports/payment-transactions/excel", { responseType: "blob", params })
  );
};

// ============================================================
//  Xuất PDF (responseType: 'blob')
// ============================================================

export const exportFeePeriodPdfAPI = (feePeriodIds) =>
  callApi(
    axiosClient.get("/api/reports/fee-periods/pdf", {
      responseType: "blob",
      params: { feePeriodIds: joinIds(feePeriodIds) },
    })
  );

export const exportDonationPdfAPI = (feeId) =>
  callApi(axiosClient.get(`/api/reports/donations/${feeId}/pdf`, { responseType: "blob" }));

export const exportHouseholdPdfAPI = () =>
  callApi(axiosClient.get("/api/reports/households/pdf", { responseType: "blob" }));

export const exportResidentPdfAPI = () =>
  callApi(axiosClient.get("/api/reports/residents/pdf", { responseType: "blob" }));

export const exportTransactionPdfAPI = ({ status, from, to } = {}) => {
  const params = {};
  if (status) params.status = status;
  if (from) params.from = from;
  if (to) params.to = to;
  return callApi(
    axiosClient.get("/api/reports/payment-transactions/pdf", { responseType: "blob", params })
  );
};
