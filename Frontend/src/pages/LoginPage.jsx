// ============================================================
//  LoginPage — đăng nhập (UC-LOGIN)
//  POST /api/auth/login -> lưu JWT qua AuthContext -> điều hướng /app
// ============================================================
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";
import { loginAPI } from "../api/authApi";
import { useAuth } from "../context/AuthContext";
import { Button, Input } from "../components/common";
import { AuthShell, AuthError } from "../components/auth/AuthShell";

export function LoginPage() {
  const navigate = useNavigate();
  const { loginWithAuth } = useAuth();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!username.trim() || !password) {
      setError("Vui lòng nhập tên đăng nhập và mật khẩu");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const result = await loginAPI(username.trim(), password);
      if (result.success) {
        loginWithAuth(result.auth);
        navigate("/app", { replace: true });
      } else {
        setError(result.message);
      }
    } catch (err) {
      setError("Lỗi kết nối server. Vui lòng thử lại.");
      console.error("Login error:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell showTabs>
      <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); handleLogin(); }}>
        <Input
          label="Tên đăng nhập"
          placeholder="Nhập tên đăng nhập"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />
        <label className="block">
          <span className="mb-1.5 block text-sm font-semibold text-slate-700">Mật khẩu</span>
          <div className="relative">
            <input
              style={{ colorScheme: "light" }}
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 pr-12 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
              type={showPassword ? "text" : "password"}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button
              type="button"
              aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
              title={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
              onClick={() => setShowPassword((current) => !current)}
              className="absolute right-3 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-200"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </label>
        <div className="text-right">
          <button
            type="button"
            onClick={() => navigate("/forgot-password")}
            className="text-sm font-semibold text-sky-700 hover:text-sky-800"
          >
            Quên mật khẩu?
          </button>
        </div>

        <AuthError>{error}</AuthError>

        <Button className="w-full py-3" onClick={handleLogin} disabled={loading}>
          {loading ? "Đang xử lý..." : "Đăng nhập"}
        </Button>
      </form>
    </AuthShell>
  );
}
