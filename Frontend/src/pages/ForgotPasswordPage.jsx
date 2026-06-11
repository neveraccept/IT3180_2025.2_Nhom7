// ============================================================
//  ForgotPasswordPage — quên mật khẩu (UC-FORGOT-PASSWORD), bước 1: nhập email
//  Gửi OTP (POST /api/auth/forgot-password/send-otp) -> chuyển sang /verify-otp
//  với purpose=FORGOT để nhập OTP + mật khẩu mới.
// ============================================================
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { forgotPasswordSendOtpAPI } from "../api/otpApi";
import { Button, Input } from "../components/common";
import { AuthShell, AuthError } from "../components/auth/AuthShell";
import { logError } from "../utils/logger";

export function ForgotPasswordPage() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSendOtp = async () => {
    const cleanEmail = email.trim();
    if (!cleanEmail) {
      setError("Vui lòng nhập email đã đăng ký");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await forgotPasswordSendOtpAPI(cleanEmail);
      // Backend luôn trả 200 (chống dò email).
      if (res.success) {
        navigate("/verify-otp", { state: { purpose: "FORGOT", email: cleanEmail } });
      } else {
        setError(res.message);
      }
    } catch (err) {
      setError("Lỗi kết nối server. Vui lòng thử lại.");
      logError("Forgot OTP error:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell subtitle="Quên mật khẩu — đặt lại bằng mã OTP qua email">
      <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); handleSendOtp(); }}>
        <Input
          label="Email đã đăng ký"
          type="email"
          placeholder="name@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <AuthError>{error}</AuthError>

        <Button className="w-full py-3" onClick={handleSendOtp} disabled={loading}>
          {loading ? "Đang xử lý..." : "Gửi mã OTP"}
        </Button>

        <div className="text-center">
          <button type="button" onClick={() => navigate("/login")} className="text-sm font-semibold text-sky-700 hover:text-sky-800">
            ← Quay lại đăng nhập
          </button>
        </div>
      </form>
    </AuthShell>
  );
}
