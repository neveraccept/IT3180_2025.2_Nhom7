// ============================================================
//  AuthContext — lưu JWT + thông tin user, khôi phục phiên khi tải lại trang
// ============================================================
import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { getStoredAuth, setStoredAuth, clearStoredAuth, setAuthFailureHandler } from "../api/axiosClient";

const AuthContext = createContext(null);

// Chuẩn hoá object auth (đã lưu) -> user dùng cho UI.
function toUser(auth) {
  if (!auth?.token) return null;
  return {
    userId: auth.userId,
    username: auth.username,
    name: auth.username,
    fullName: auth.username,
    role: auth.role, // "ADMIN" | "RESIDENT"
    householdId: auth.householdId ?? null,
    token: auth.token,
  };
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [initializing, setInitializing] = useState(true);

  // Khôi phục phiên từ JWT đã lưu.
  useEffect(() => {
    setUser(toUser(getStoredAuth()));
    setInitializing(false);
  }, []);

  useEffect(() => setAuthFailureHandler(() => setUser(null)), []);

  // Gọi sau khi loginAPI thành công (nhận object auth đã lưu localStorage).
  const loginWithAuth = useCallback((auth) => {
    setStoredAuth(auth);
    setUser(toUser(auth));
  }, []);

  const logout = useCallback(() => {
    clearStoredAuth();
    setUser(null);
  }, []);

  // Cập nhật cục bộ thông tin hiển thị (vd: sau khi sửa hồ sơ).
  const updateUser = useCallback((patch) => {
    setUser((prev) => {
      if (!prev) return prev;
      const next = typeof patch === "function" ? patch(prev) : patch;
      return { ...prev, ...next };
    });
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        setUser: updateUser,
        loginWithAuth,
        logout,
        isAuthenticated: !!user,
        role: user?.role || null,
        initializing,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
