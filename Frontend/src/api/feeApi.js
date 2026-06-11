// ============================================================
//  feeApi — Module 4: Khoản thu (Fee) + Đợt thu (FeePeriod)
//  Map trực tiếp FeeController (/api/fees) & FeePeriodController (/api/fee-periods).
//  Toàn bộ endpoint yêu cầu quyền ADMIN (JWT gắn sẵn qua axiosClient).
//  Phân trang: PageResponse<T> = { items, totalElements, totalPages, page(0-based), size }
//  Lưu ý DTO backend:
//    FeeDTO       = { id, name, type, unitPrice, unit, description, active }
//    FeePeriodDTO = { id, feeId, name, startDate, endDate, status(OPEN|CLOSED) }
// ============================================================
import axiosClient, { callApi } from "./axiosClient";

// ----------------------------- KHOẢN THU (Fee) -----------------------------

// GET /api/fees?page=&size=&sort= -> danh sách khoản thu (phân trang)
export const listFeesAPI = ({ page = 0, size = 100, sort = "id,asc" } = {}) =>
  callApi(axiosClient.get("/api/fees", { params: { page, size, sort } }));

// GET /api/fees/search?keyword=&type=&active=&page=&size=
// Bỏ qua tham số rỗng để backend không lọc nhầm.
export const searchFeesAPI = ({ keyword, type, active, page = 0, size = 100, sort = "id,asc" } = {}) => {
  const params = { page, size, sort };
  if (keyword) params.keyword = keyword;
  if (type) params.type = type;
  if (active !== undefined && active !== null && active !== "") params.active = active;
  return callApi(axiosClient.get("/api/fees/search", { params }));
};

// GET /api/fees/{id} -> FeeDTO
export const getFeeByIdAPI = (id) => callApi(axiosClient.get(`/api/fees/${id}`));

// POST /api/fees -> tạo khoản thu { name, type, unitPrice, unit, description, active }
export const createFeeAPI = (payload) => callApi(axiosClient.post("/api/fees", payload));

// PUT /api/fees/{id} -> cập nhật khoản thu
export const updateFeeAPI = (id, payload) => callApi(axiosClient.put(`/api/fees/${id}`, payload));

// DELETE /api/fees/{id} -> xoá hoặc ngừng dùng khoản thu (backend tự quyết)
export const deleteFeeAPI = (id) => callApi(axiosClient.delete(`/api/fees/${id}`));

// ----------------------------- ĐỢT THU (FeePeriod) -------------------------

// GET /api/fee-periods?page=&size=&sort= -> danh sách đợt thu (phân trang)
export const listFeePeriodsAPI = ({ page = 0, size = 100, sort = "id,desc" } = {}) =>
  callApi(axiosClient.get("/api/fee-periods", { params: { page, size, sort } }));

// GET /api/fee-periods/{id} -> FeePeriodDTO
export const getFeePeriodByIdAPI = (id) => callApi(axiosClient.get(`/api/fee-periods/${id}`));

// POST /api/fee-periods -> tạo đợt thu { feeId, name, startDate, endDate }
export const createFeePeriodAPI = (payload) =>
  callApi(axiosClient.post("/api/fee-periods", payload));

// PUT /api/fee-periods/{id} -> cập nhật đợt thu { name, startDate, endDate }
export const updateFeePeriodAPI = (id, payload) =>
  callApi(axiosClient.put(`/api/fee-periods/${id}`, payload));

// PUT /api/fee-periods/{id}/close -> đóng đợt thu (status -> CLOSED)
export const closeFeePeriodAPI = (id) =>
  callApi(axiosClient.put(`/api/fee-periods/${id}/close`));
