// ============================================================
//  AppShell — vùng ứng dụng sau khi đăng nhập (được ProtectedRoute bọc)
//  Toàn bộ dữ liệu (tài khoản, khoản thu, thanh toán, khiếu nại, thông báo...)
//  Lấy user/logout từ AuthContext.
// ============================================================
import { useAuth } from "../context/AuthContext";
import { Layout } from "../components/layout/Layout";

export function AppShell() {
  const { user, setUser, logout } = useAuth();

  return <Layout user={user} setUser={setUser} logout={logout} />;
}
