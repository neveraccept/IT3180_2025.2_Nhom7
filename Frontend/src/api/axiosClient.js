// ============================================================
//  axiosClient — instance axios dùng chung cho toàn bộ API
//  Nguồn sự thật: Backend Spring Boot (org.example.backend), port 9090
//  - Tự gắn JWT Bearer (request interceptor)
//  - callApi() chuẩn hoá kết quả về { success, data, message, errorCode, status }
//    để các page xử lý đồng nhất (ApiResponse<T> hoặc Map {message}/{error})
// ============================================================
import axios from "axios";

const BASE_URL =
  (typeof import.meta !== "undefined" && import.meta.env && import.meta.env.VITE_API_BASE_URL) ||
  "http://localhost:9090";

const AUTH_STORAGE_KEY = "bluemoon_auth";
const LAST_SEEN_KEY = "bluemoon_last_seen";

// Idle timeout: nếu tab đóng (ngừng cập nhật lastSeen) lâu hơn mốc này thì
// phiên bị coi là hết hạn -> phải đăng nhập lại. Trong lúc tab đang mở,
// AuthContext cập nhật lastSeen định kỳ nên phiên sống tới hạn token (24h).
const IDLE_TIMEOUT_MS = 10 * 60 * 1000; // 10 phút

// ---------- Dấu hiệu "phiên còn sống" ----------
// Gọi định kỳ khi tab đang mở để gia hạn mốc lastSeen.
export const touchSession = () => {
  try {
    localStorage.setItem(LAST_SEEN_KEY, String(Date.now()));
  } catch {
    // ignore
  }
};

// Vắng mặt (không cập nhật lastSeen) quá IDLE_TIMEOUT_MS -> hết phiên.
const isIdleExpired = () => {
  try {
    const raw = localStorage.getItem(LAST_SEEN_KEY);
    if (!raw) return false; // chưa có mốc -> chưa coi là hết hạn
    return Date.now() - Number(raw) > IDLE_TIMEOUT_MS;
  } catch {
    return false;
  }
};

// ---------- Lưu trữ phiên đăng nhập (token + thông tin user) ----------
export const getStoredAuth = () => {
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return null;
    if (isIdleExpired()) {
      // Tắt trang quá lâu -> xoá phiên, buộc đăng nhập lại.
      clearStoredAuth();
      return null;
    }
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

export const getToken = () => getStoredAuth()?.token || null;

export const setStoredAuth = (auth) => {
  try {
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(auth));
    touchSession(); // đánh dấu phiên còn sống ngay khi đăng nhập
  } catch {
    // Trình duyệt chặn localStorage -> phiên chỉ tồn tại trong bộ nhớ.
  }
};

export const clearStoredAuth = () => {
  try {
    localStorage.removeItem(AUTH_STORAGE_KEY);
    localStorage.removeItem(LAST_SEEN_KEY);
  } catch {
    // ignore
  }
};

let authFailureHandler = null;

export const setAuthFailureHandler = (handler) => {
  authFailureHandler = handler;
  return () => {
    if (authFailureHandler === handler) authFailureHandler = null;
  };
};

function handleAuthFailure() {
  clearStoredAuth();
  authFailureHandler?.();
}

// ---------- Instance axios ----------
const axiosClient = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  headers: { "Content-Type": "application/json" },
});

// Request interceptor: tự đính kèm JWT nếu đã đăng nhập.
axiosClient.interceptors.request.use((config) => {
  const token = getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

axiosClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    if ((status === 401 || status === 403) && getToken()) {
      handleAuthFailure();
    }
    return Promise.reject(error);
  }
);

// ---------- Chuẩn hoá kết quả ----------
// Bọc mọi lời gọi axios để page nhận về cùng một shape, không phải try/catch lặp lại.
export async function callApi(promise) {
  try {
    const res = await promise;
    const payload = res.data;
    const hasEnvelope =
      payload && typeof payload === "object" && Object.prototype.hasOwnProperty.call(payload, "data");
    return {
      success: true,
      status: res.status,
      data: hasEnvelope ? payload.data : payload,
      message: payload?.message || "",
      errorCode: null,
      raw: payload,
    };
  } catch (err) {
    // Lỗi có phản hồi từ server (4xx/5xx)
    if (err.response) {
      const p = err.response.data;
      return {
        success: false,
        status: err.response.status,
        data: null,
        message: p?.message || p?.error || `Lỗi máy chủ (${err.response.status})`,
        errorCode: p?.errorCode || null,
      };
    }
    // Lỗi mạng / timeout
    const timeout = err.code === "ECONNABORTED";
    return {
      success: false,
      status: 0,
      data: null,
      message: timeout
        ? "Yêu cầu vượt quá thời gian chờ. Vui lòng thử lại."
        : "Không thể kết nối tới máy chủ. Kiểm tra backend (http://localhost:9090) hoặc kết nối mạng.",
      errorCode: timeout ? "TIMEOUT" : "NETWORK_ERROR",
    };
  }
}

export { BASE_URL };
export default axiosClient;
