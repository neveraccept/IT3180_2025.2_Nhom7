// ============================================================
//  AppRoutes — cấu hình React Router cho toàn ứng dụng
//  - Public: /, /login, /register, /forgot-password, /verify-otp
//  - Protected (đăng nhập): /app/* -> AppShell (Layout hub)
// ============================================================
import { Routes, Route, Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { IntroductionPage } from "../pages/IntroductionPage";
import { LoginPage } from "../pages/LoginPage";
import { RegisterPage } from "../pages/RegisterPage";
import { ForgotPasswordPage } from "../pages/ForgotPasswordPage";
import { OtpVerifyPage } from "../pages/OtpVerifyPage";
import { ProtectedRoute } from "./ProtectedRoute";
import { AppShell } from "./AppShell";

// Chặn người đã đăng nhập vào lại các trang auth.
function PublicOnly({ children }) {
  const { isAuthenticated, initializing } = useAuth();
  if (initializing) return null;
  if (isAuthenticated) return <Navigate to="/app" replace />;
  return children;
}

// Trang giới thiệu (landing). Đã đăng nhập -> vào thẳng /app.
function IntroLanding() {
  const navigate = useNavigate();
  const { isAuthenticated, initializing } = useAuth();
  if (initializing) return null;
  if (isAuthenticated) return <Navigate to="/app" replace />;
  return (
    <IntroductionPage
      onStartLogin={() => navigate("/login")}
      onStartRegister={() => navigate("/register")}
    />
  );
}

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<IntroLanding />} />
      <Route path="/login" element={<PublicOnly><LoginPage /></PublicOnly>} />
      <Route path="/register" element={<PublicOnly><RegisterPage /></PublicOnly>} />
      <Route path="/forgot-password" element={<PublicOnly><ForgotPasswordPage /></PublicOnly>} />
      <Route path="/verify-otp" element={<PublicOnly><OtpVerifyPage /></PublicOnly>} />

      <Route
        path="/app/*"
        element={
          <ProtectedRoute>
            <AppShell />
          </ProtectedRoute>
        }
      />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
