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

// PUT /api/auth/me/password -> đổi mật khẩu (đã đăng nhập)
export const changePasswordAPI = (payload) => callApi(axiosClient.put("/api/auth/me/password", payload));

// GET /api/auth/me/profile -> { id, username, phone, role }
export const getProfileAPI = () => callApi(axiosClient.get("/api/auth/me/profile"));

// PUT /api/auth/me/profile -> backend chỉ nhận { username, phone }
export const updateProfileAPI = (payload) => callApi(axiosClient.put("/api/auth/me/profile", payload));

// POST /api/auth/createAccount -> Admin tạo tài khoản nội bộ (ADMIN/RESIDENT)
export const createInternalAccountAPI = (payload) =>
  callApi(axiosClient.post("/api/auth/createAccount", payload));

// PUT /api/auth/{id}/approve -> Admin duyệt tài khoản cư dân
export const approveAccountAPI = (id) => callApi(axiosClient.put(`/api/auth/${id}/approve`));
