// ============================================================
//  LoginPage — đăng nhập (UC-LOGIN)
//  POST /api/auth/login -> lưu JWT qua AuthContext -> điều hướng /app
// ============================================================
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { loginAPI } from "../api/authApi";
import { useAuth } from "../context/AuthContext";
import { Button, Input } from "../components/common";
import { AuthShell, AuthError } from "../components/auth/AuthShell";

export function LoginPage() {
  const navigate = useNavigate();
  const { loginWithAuth } = useAuth();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
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
        <Input
          label="Mật khẩu"
          type="password"
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
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
