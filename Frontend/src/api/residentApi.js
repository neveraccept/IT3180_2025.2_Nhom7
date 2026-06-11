// ============================================================
//  residentApi — Module 3: Quản lý nhân khẩu
//  Map trực tiếp ResidentController (/api/residents) của backend (ROLE_ADMIN).
//  ResidentSummaryDTO{ id, fullName, idCard, dateOfBirth, gender,
//    relationToHead, residencyStatus(PERMANENT|TEMPORARY|ABSENT), status(ACTIVE|MOVED_OUT) }
// ============================================================
import axiosClient, { callApi } from "./axiosClient";

// GET /api/residents?name&idCard&residencyStatus&householdId&status&page&size&sort
// -> PageResponse<ResidentSummaryDTO>. Bỏ qua tham số rỗng.
export const searchResidentsAPI = ({
  name,
  idCard,
  residencyStatus,
  householdId,
  status,
  page = 0,
  size = 20,
  sort = "fullName,asc",
} = {}) => {
  const params = { page, size, sort };
  if (name) params.name = name;
  if (idCard) params.idCard = idCard;
  if (residencyStatus) params.residencyStatus = residencyStatus;
  if (householdId !== undefined && householdId !== null && householdId !== "")
    params.householdId = householdId;
  if (status) params.status = status;
  return callApi(axiosClient.get("/api/residents", { params }));
};

// GET /api/residents/{id} -> ResidentDetailDTO
export const getResidentByIdAPI = (id) =>
  callApi(axiosClient.get(`/api/residents/${id}`));

// POST /api/residents -> thêm nhân khẩu vào hộ (F3.1)
// payload: { householdId, fullName, idCard, dateOfBirth, gender, relationToHead, residencyStatus? }
export const createResidentAPI = (payload) =>
  callApi(axiosClient.post("/api/residents", payload));

// PUT /api/residents/{id} -> sửa nhân khẩu (F3.2)
// payload: { fullName, idCard, dateOfBirth, gender, relationToHead }
export const updateResidentAPI = (id, payload) =>
  callApi(axiosClient.put(`/api/residents/${id}`, payload));

// PUT /api/residents/{id}/move-out -> chuyển nhân khẩu khỏi hộ (status=MOVED_OUT) (F3.3)
export const moveOutResidentAPI = (id) =>
  callApi(axiosClient.put(`/api/residents/${id}/move-out`));

// PUT /api/residents/{id}/temporary-residence -> đăng ký tạm trú (F3.4)
export const registerTemporaryResidenceAPI = (id) =>
  callApi(axiosClient.put(`/api/residents/${id}/temporary-residence`));

// PUT /api/residents/{id}/permanent-residence -> chuyển tạm trú về thường trú
export const registerPermanentResidenceAPI = (id) =>
  callApi(axiosClient.put(`/api/residents/${id}/permanent-residence`));
