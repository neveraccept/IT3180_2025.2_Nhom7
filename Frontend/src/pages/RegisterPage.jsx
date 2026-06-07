// ============================================================
//  RegisterPage — cư dân tự đăng ký (UC-REGISTER), bước 1: nhập thông tin
//  Gửi OTP (POST /api/auth/register/send-otp) -> chuyển sang /verify-otp
//  mang theo payload đăng ký để OtpVerifyPage hoàn tất.
// ============================================================
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { sendRegisterOtpAPI } from "../api/otpApi";
import { Button, Input } from "../components/common";
import { AuthShell, AuthError } from "../components/auth/AuthShell";

export function RegisterPage() {
  const navigate = useNavigate();

  const [fullName, setFullName] = useState("");
  const [apartment, setApartment] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSendOtp = async () => {
    const cleanFullName = fullName.trim();
    const cleanUsername = username.trim();
    const cleanEmail = email.trim();
    const cleanApartment = apartment.trim();

    if (!cleanFullName || !cleanUsername || !password || !confirmPassword || !cleanEmail || !cleanApartment) {
      setError("Vui lòng nhập đầy đủ họ tên, mã căn hộ, email, tên đăng nhập và mật khẩu");
      return;
    }
    if (password.length < 8) {
      setError("Mật khẩu phải có tối thiểu 8 ký tự");
      return;
    }
    if (password !== confirmPassword) {
      setError("Mật khẩu nhập lại không khớp");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await sendRegisterOtpAPI(cleanEmail);
      if (res.success) {
        // Chuyển sang trang nhập OTP, mang theo dữ liệu đăng ký.
        navigate("/verify-otp", {
          state: {
            purpose: "REGISTER",
            email: cleanEmail,
            payload: {
              username: cleanUsername,
              password,
              confirmPassword,
              fullName: cleanFullName,
              email: cleanEmail,
              phone: phone.trim(),
              requestedApartmentCode: cleanApartment,
            },
          },
        });
      } else {
        setError(res.message);
      }
    } catch (err) {
      setError("Lỗi kết nối server. Vui lòng thử lại.");
      console.error("Send register OTP error:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell showTabs>
      <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); handleSendOtp(); }}>
        <div className="grid gap-4 md:grid-cols-2">
          <Input label="Họ tên" placeholder="Nguyễn Văn A" value={fullName} onChange={(e) => setFullName(e.target.value)} />
          <Input label="Mã căn hộ" placeholder="A12-01" value={apartment} onChange={(e) => setApartment(e.target.value)} />
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <Input label="Email" type="email" placeholder="name@email.com" value={email} onChange={(e) => setEmail(e.target.value)} />
          <Input label="Số điện thoại" placeholder="09xxxxxxxx" value={phone} onChange={(e) => setPhone(e.target.value)} />
        </div>
        <Input label="Tên đăng nhập" placeholder="Nhập tên đăng nhập" value={username} onChange={(e) => setUsername(e.target.value)} />
        <Input label="Mật khẩu" type="password" placeholder="Tối thiểu 8 ký tự" value={password} onChange={(e) => setPassword(e.target.value)} />
        <Input label="Nhập lại mật khẩu" type="password" placeholder="Nhập lại mật khẩu" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />

        <AuthError>{error}</AuthError>

        <Button className="w-full py-3" onClick={handleSendOtp} disabled={loading}>
          {loading ? "Đang xử lý..." : "Gửi mã OTP"}
        </Button>
      </form>
    </AuthShell>
  );
}
