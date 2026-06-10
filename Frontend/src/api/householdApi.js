// ============================================================
//  householdApi — Module 2: Hộ gia đình (lồng dưới căn hộ)
//  Backend KHÔNG có HouseholdController riêng; mọi thao tác hộ dân
//  đi qua ApartmentController dạng /api/apartments/{apartmentId}/household.
//  Trả về HouseholdSummaryDTO{ id, code, apartmentId, apartmentCode,
//    moveInDate, status(ACTIVE|MOVED_OUT), headOfHousehold, residents[] }
// ============================================================
import axiosClient, { callApi } from "./axiosClient";

// GET /api/apartments/{id}/household -> hộ ACTIVE đang ở trong căn hộ
// (404 NO_ACTIVE_HOUSEHOLD nếu căn hộ trống)
export const getActiveHouseholdAPI = (apartmentId) =>
  callApi(axiosClient.get(`/api/apartments/${apartmentId}/household`));

// POST /api/apartments/{id}/household -> gán hộ mới vào căn hộ trống (F2.7)
// payload: { code, moveInDate, headOfHousehold: { fullName, idCard, dateOfBirth, gender, relationToHead, residencyStatus } }
export const assignHouseholdAPI = (apartmentId, payload) =>
  callApi(axiosClient.post(`/api/apartments/${apartmentId}/household`, payload));

// PUT /api/apartments/{id}/household -> cập nhật hộ hoặc chuyển hộ đi (F2.6/F2.8)
// payload UPDATE:   { action: "UPDATE", code?, moveInDate?, headResidentId? }
// payload MOVE_OUT: { action: "MOVE_OUT" }
export const updateHouseholdAPI = (apartmentId, payload) =>
  callApi(axiosClient.put(`/api/apartments/${apartmentId}/household`, payload));

// Tiện ích: chuyển hộ ra khỏi căn hộ
export const moveOutHouseholdAPI = (apartmentId) =>
  updateHouseholdAPI(apartmentId, { action: "MOVE_OUT" });

// ============================================================
//  API theo "hành động nghiệp vụ" — lấy Hộ gia đình làm trung tâm
//  (HouseholdController /api/households, ROLE_ADMIN)
// ============================================================

// Action 1 – Bàn giao nhà: POST /api/households/move-in
// payload: { apartmentCode, householdCode, moveInDate,
//   headOfHousehold: { fullName, idCard, dateOfBirth, gender, relationToHead, residencyStatus }, createAccount }
// -> { household: HouseholdSummaryDTO, account: AccountCreatedDTO|null }
export const moveInAPI = (payload) =>
  callApi(axiosClient.post("/api/households/move-in", payload));

// Action 2 – Thêm nhân khẩu vào hộ: POST /api/households/{householdId}/members
// payload: { fullName, idCard, dateOfBirth, gender, relationToHead, residencyStatus? }
export const addMemberAPI = (householdId, payload) =>
  callApi(axiosClient.post(`/api/households/${householdId}/members`, payload));

// Action 4 – Chuyển cả hộ đi: POST /api/households/{householdId}/move-out
export const moveOutByHouseholdIdAPI = (householdId) =>
  callApi(axiosClient.post(`/api/households/${householdId}/move-out`));

// GET /api/households/{householdId}/accounts -> danh sách UserDTO gắn với hộ
export const getHouseholdAccountsAPI = (householdId) =>
  callApi(axiosClient.get(`/api/households/${householdId}/accounts`));
