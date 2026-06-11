// ============================================================
//  OtpVerifyPage — xác thực OTP (UC-VERIFY-OTP) dùng chung 2 luồng:
//   - REGISTER: verify OTP -> tạo tài khoản (POST /register) -> /login
//   - FORGOT  : nhập OTP + mật khẩu mới -> reset (POST /reset-password) -> /login
//  Dữ liệu (purpose/email/payload) nhận qua state điều hướng của React Router.
// ============================================================
import { useState } from "react";
import { useNavigate, useLocation, Navigate } from "react-router-dom";
import { verifyRegisterOtpAPI, resetPasswordAPI } from "../api/otpApi";
import { registerAPI } from "../api/authApi";
import { sendRegisterOtpAPI, forgotPasswordSendOtpAPI } from "../api/otpApi";
import { Button, Input } from "../components/common";
import { AuthShell, AuthError, AuthInfo } from "../components/auth/AuthShell";
import { logError } from "../utils/logger";

export function OtpVerifyPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state || {};
  const { purpose, email, payload } = state;

  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(false);

  // Truy cập trực tiếp không có ngữ cảnh -> quay về đăng nhập.
  if (!purpose || !email) {
    return <Navigate to="/login" replace />;
  }

  const isRegister = purpose === "REGISTER";

  // ----- REGISTER: xác thực OTP rồi tạo tài khoản -----
  const handleRegister = async () => {
    if (otp.trim().length !== 6) {
      setError("Vui lòng nhập đúng mã OTP gồm 6 chữ số");
      return;
    }

    setLoading(true);
    setError("");
    setInfo("");

    try {
      const verifyRes = await verifyRegisterOtpAPI(email, otp.trim());
      if (!verifyRes.success) {
        setError(verifyRes.message || "Mã OTP không hợp lệ");
        return;
      }

      const registerRes = await registerAPI(payload);
      if (!registerRes.success) {
        setError(registerRes.message || "Đăng ký thất bại");
        return;
      }

      setInfo("Đăng ký thành công! Tài khoản đang chờ Ban quản trị duyệt. Đang chuyển về trang đăng nhập...");
      setTimeout(() => navigate("/login", { replace: true }), 2500);
    } catch (err) {
      setError("Lỗi kết nối server. Vui lòng thử lại.");
      logError("Verify + register error:", err);
    } finally {
      setLoading(false);
    }
  };

  // ----- FORGOT: nhập OTP + mật khẩu mới rồi đặt lại -----
  const handleReset = async () => {
    if (otp.trim().length !== 6) {
      setError("Vui lòng nhập đúng mã OTP gồm 6 chữ số");
      return;
    }
    if (newPassword.length < 8) {
      setError("Mật khẩu mới phải có tối thiểu 8 ký tự");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Mật khẩu mới nhập lại không khớp");
      return;
    }

    setLoading(true);
    setError("");
    setInfo("");

    try {
      const res = await resetPasswordAPI({
        email,
        otp: otp.trim(),
        newPassword,
        confirmNewPassword: confirmPassword,
      });
      if (res.success) {
        setInfo(res.message || "Đặt lại mật khẩu thành công. Đang chuyển về trang đăng nhập...");
        setTimeout(() => navigate("/login", { replace: true }), 2500);
      } else {
        setError(res.message);
      }
    } catch (err) {
      setError("Lỗi kết nối server. Vui lòng thử lại.");
      logError("Reset password error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setError("");
    setInfo("");
    try {
      const res = isRegister ? await sendRegisterOtpAPI(email) : await forgotPasswordSendOtpAPI(email);
      if (res.success) setInfo("Đã gửi lại mã OTP. Vui lòng kiểm tra email.");
      else setError(res.message);
    } catch (err) {
      setError("Lỗi kết nối server. Vui lòng thử lại.");
      logError("Resend OTP error:", err);
    }
  };

  const handleSubmit = () => (isRegister ? handleRegister() : handleReset());

  return (
    <AuthShell subtitle={isRegister ? "Xác thực email để hoàn tất đăng ký" : "Nhập mã OTP và mật khẩu mới"}>
      <AuthInfo>{info}</AuthInfo>
      <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); handleSubmit(); }}>
        <Input
          label={`Mã OTP đã gửi tới ${email}`}
          placeholder="Nhập 6 chữ số"
          inputMode="numeric"
          maxLength={6}
          value={otp}
          onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
        />

        {!isRegister && (
          <>
            <Input
              label="Mật khẩu mới"
              type="password"
              placeholder="Tối thiểu 8 ký tự"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
            <Input
              label="Nhập lại mật khẩu mới"
              type="password"
              placeholder="Nhập lại mật khẩu mới"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </>
        )}

        <div className="flex items-center justify-between text-sm">
          <button
            type="button"
            onClick={() => navigate(isRegister ? "/register" : "/forgot-password")}
            className="font-semibold text-slate-500 hover:text-slate-700"
          >
            ← Quay lại
          </button>
          <button
            type="button"
            onClick={handleResend}
            disabled={loading}
            className="font-semibold text-sky-700 hover:text-sky-800 disabled:opacity-50"
          >
            Gửi lại mã
          </button>
        </div>

        <AuthError>{error}</AuthError>

        <Button className="w-full py-3" onClick={handleSubmit} disabled={loading}>
          {loading ? "Đang xử lý..." : isRegister ? "Xác thực & Hoàn tất đăng ký" : "Đặt lại mật khẩu"}
        </Button>
      </form>
    </AuthShell>
  );
}
