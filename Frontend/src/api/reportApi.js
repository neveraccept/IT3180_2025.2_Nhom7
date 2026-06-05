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

export const getFeePeriodStatisticsAPI = (feePeriodId) =>
  callApi(axiosClient.get(`/api/reports/fee-periods/${feePeriodId}/statistics`));

export const getDonationStatisticsAPI = (feePeriodId) =>
  callApi(axiosClient.get(`/api/reports/donations/${feePeriodId}/statistics`));

export const getHouseholdStatisticsAPI = () =>
  callApi(axiosClient.get("/api/reports/households/statistics"));

export const getResidentStatisticsAPI = () =>
  callApi(axiosClient.get("/api/reports/residents/statistics"));

// ============================================================
//  Xuất Excel (responseType: 'blob')
// ============================================================

export const exportFeePeriodExcelAPI = (feePeriodId) =>
  callApi(axiosClient.get(`/api/reports/fee-periods/${feePeriodId}/excel`, { responseType: "blob" }));

export const exportDonationExcelAPI = (feePeriodId) =>
  callApi(axiosClient.get(`/api/reports/donations/${feePeriodId}/excel`, { responseType: "blob" }));

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

export const exportFeePeriodPdfAPI = (feePeriodId) =>
  callApi(axiosClient.get(`/api/reports/fee-periods/${feePeriodId}/pdf`, { responseType: "blob" }));

export const exportDonationPdfAPI = (feePeriodId) =>
  callApi(axiosClient.get(`/api/reports/donations/${feePeriodId}/pdf`, { responseType: "blob" }));

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
