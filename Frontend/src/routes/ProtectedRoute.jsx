// ============================================================
//  ProtectedRoute — bảo vệ route theo trạng thái đăng nhập + role (RBAC)
// ============================================================
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export function ProtectedRoute({ allowedRoles, children }) {
  const { isAuthenticated, role, initializing } = useAuth();

  // Chờ khôi phục phiên từ localStorage để tránh đá người dùng ra /login khi F5.
  if (initializing) return null;

  if (!isAuthenticated) return <Navigate to="/login" replace />;

  if (allowedRoles && !allowedRoles.includes(role)) {
    return <Navigate to="/app" replace />;
  }

  return children;
}
