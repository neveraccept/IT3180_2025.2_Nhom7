// ============================================================
//  authApi — Module 1: đăng nhập, đăng ký, đổi mật khẩu, hồ sơ, duyệt tài khoản
//  Map trực tiếp AuthController / ProfileController của backend.
// ============================================================
import axiosClient, { callApi, setStoredAuth } from "./axiosClient";

// POST /api/auth/login -> lưu JWT, trả { success, auth, message }
export const loginAPI = async (username, password) => {
  const res = await callApi(axiosClient.post("/api/auth/login", { username, password }));
  if (res.success && res.data) {
    const auth = {
      token: res.data.accessToken,
      tokenType: res.data.tokenType || "Bearer",
      userId: res.data.userId,
      role: res.data.role, // "ADMIN" | "RESIDENT"
      householdId: res.data.householdId ?? null,
      username, // backend không trả username trong token response -> lấy từ form
    };
    setStoredAuth(auth);
    return { success: true, auth, message: res.message };
  }
  return { success: false, message: res.message || "Đăng nhập thất bại", errorCode: res.errorCode };
};

// POST /api/auth/register -> tạo tài khoản cư dân (active=false, chờ Admin duyệt)
export const registerAPI = (payload) => callApi(axiosClient.post("/api/auth/register", payload));

// PUT /api/me/password -> đổi mật khẩu (đã đăng nhập)
export const changePasswordAPI = (payload) => callApi(axiosClient.put("/api/me/password", payload));

// GET /api/me/profile -> { id, username, fullName, email, phone, role, apartmentCode }
export const getProfileAPI = () => callApi(axiosClient.get("/api/me/profile"));

// PUT /api/me/profile/update -> backend chỉ nhận { username, phone }
export const updateProfileAPI = (payload) => callApi(axiosClient.put("/api/me/profile/update", payload));

// ----- Quản lý tài khoản (UserController, /api/users — chỉ ADMIN) -----

// GET /api/users -> danh sách TẤT CẢ tài khoản
export const getAllUsersAPI = () => callApi(axiosClient.get("/api/users"));

// GET /api/users/pending -> danh sách tài khoản cư dân đang chờ duyệt
export const getPendingAccountsAPI = () => callApi(axiosClient.get("/api/users/pending"));

// POST /api/users -> Admin tạo tài khoản nội bộ (ADMIN/RESIDENT)
export const createInternalAccountAPI = (payload) =>
  callApi(axiosClient.post("/api/users", payload));

// PUT /api/users/{id}/approve -> Admin duyệt tài khoản cư dân.
// payload (tùy chọn) gắn/tạo nhân khẩu cho tài khoản:
//   { linkResidentId?, idCard?, dateOfBirth?, gender?, relationToHead?, residencyStatus?, newHouseholdCode?, moveInDate? }
export const approveAccountAPI = (id, payload) =>
  callApi(axiosClient.put(`/api/users/${id}/approve`, payload || {}));

// DELETE /api/users/{id}/reject -> Admin từ chối & xóa tài khoản chờ duyệt
export const rejectAccountAPI = (id) => callApi(axiosClient.delete(`/api/users/${id}/reject`));

// PUT /api/users/{id} -> Admin cập nhật thông tin tài khoản
export const updateUserAPI = (id, payload) => callApi(axiosClient.put(`/api/users/${id}`, payload));

// DELETE /api/users/{id} -> Admin xóa mềm tài khoản (đặt deleted = true ở backend)
export const deleteUserAPI = (id) => callApi(axiosClient.delete(`/api/users/${id}`));

// POST /api/users/grant-access -> Admin cấp tài khoản đăng nhập cho 1 nhân khẩu
// payload: { residentId } -> { userId, username, temporaryPassword, role, residentId, residentName }
export const grantAccessAPI = (residentId) =>
  callApi(axiosClient.post("/api/users/grant-access", { residentId }));

// PUT /api/users/{id}/lock -> khóa tài khoản (active=false)
export const lockUserAPI = (id) => callApi(axiosClient.put(`/api/users/${id}/lock`));

// PUT /api/users/{id}/unlock -> mở khóa tài khoản (active=true)
export const unlockUserAPI = (id) => callApi(axiosClient.put(`/api/users/${id}/unlock`));
