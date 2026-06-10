import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

function LoadingScreen() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 text-slate-700">
      <div className="rounded-2xl bg-white px-6 py-4 text-sm font-semibold shadow-sm ring-1 ring-slate-200">
        Đang kiểm tra đăng nhập...
      </div>
    </div>
  );
}

export function ProtectedRoute({ allowedRoles, children }) {
  const { isAuthenticated, role, initializing } = useAuth();

  if (initializing) return <LoadingScreen />;

  if (!isAuthenticated) return <Navigate to="/login" replace />;

  if (allowedRoles && !allowedRoles.includes(role)) {
    return <Navigate to="/app" replace />;
  }

  return children;
}
