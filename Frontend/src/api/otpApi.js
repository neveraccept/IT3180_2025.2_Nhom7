// ============================================================
//  otpApi — Module 1: gửi/xác thực OTP qua email
//  Map các endpoint OTP của AuthController (trả Map {message}/{error}).
// ============================================================
import axiosClient, { callApi } from "./axiosClient";

// POST /api/auth/register/send-otp -> gửi OTP đăng ký
export const sendRegisterOtpAPI = (email) =>
  callApi(axiosClient.post("/api/auth/register/send-otp", { email }));

// POST /api/auth/register/verify-otp -> xác thực OTP đăng ký (đánh dấu email đã xác thực)
export const verifyRegisterOtpAPI = (email, otp) =>
  callApi(axiosClient.post("/api/auth/register/verify-otp", { email, otp }));

// POST /api/auth/forgot-password/send-otp -> gửi OTP quên mật khẩu (luôn 200, chống dò email)
export const forgotPasswordSendOtpAPI = (email) =>
  callApi(axiosClient.post("/api/auth/forgot-password/send-otp", { email }));

// POST /api/auth/reset-password -> đặt lại mật khẩu bằng OTP
export const resetPasswordAPI = (payload) =>
  callApi(axiosClient.post("/api/auth/reset-password", payload));
