import { Routes, Route, Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { IntroductionPage } from "../pages/IntroductionPage";
import { LoginPage } from "../pages/LoginPage";
import { RegisterPage } from "../pages/RegisterPage";
import { ForgotPasswordPage } from "../pages/ForgotPasswordPage";
import { OtpVerifyPage } from "../pages/OtpVerifyPage";
import { VnpayReturnPage } from "../pages/VnpayReturnPage";
import { ProtectedRoute } from "./ProtectedRoute";
import { AppShell } from "./AppShell";

function LoadingScreen() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 text-slate-700">
      <div className="rounded-2xl bg-white px-6 py-4 text-sm font-semibold shadow-sm ring-1 ring-slate-200">
        Đang tải BlueMoon...
      </div>
    </div>
  );
}

function PublicOnly({ children }) {
  const { isAuthenticated, initializing } = useAuth();
  if (initializing) return <LoadingScreen />;
  if (isAuthenticated) return <Navigate to="/app" replace />;
  return children;
}

function IntroLanding() {
  const navigate = useNavigate();
  const { isAuthenticated, initializing } = useAuth();

  if (initializing) return <LoadingScreen />;
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
      <Route path="/payment-result" element={<VnpayReturnPage />} />

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
