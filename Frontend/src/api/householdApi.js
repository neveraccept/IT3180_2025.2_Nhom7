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
