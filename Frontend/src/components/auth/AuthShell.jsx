// ============================================================
//  AuthShell — khung giao diện dùng chung cho các trang xác thực
//  (Login / Register / ForgotPassword / OtpVerify).
//  Giữ nguyên bố cục & class Tailwind từ thiết kế gốc.
// ============================================================
import { motion } from "framer-motion";
import { Building2, ShieldCheck } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { Card } from "../common";

export function AuthShell({ children, showTabs = false, subtitle }) {
  const navigate = useNavigate();
  const location = useLocation();
  const isLogin = location.pathname === "/login";
  const isRegister = location.pathname === "/register";

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-sky-50 via-white to-indigo-50 p-4">
      <button
        onClick={() => navigate("/")}
        className="absolute left-5 top-5 z-20 rounded-xl bg-white/85 px-4 py-2 text-sm font-bold text-sky-700 shadow-sm ring-1 ring-sky-100 hover:bg-white"
      >
        ← Về trang giới thiệu
      </button>

      <div className="mx-auto grid min-h-[calc(100vh-32px)] max-w-6xl items-center gap-8 lg:grid-cols-[1.1fr_0.9fr]">
        <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} className="hidden lg:block">
          <div className="mb-6 inline-flex items-center gap-3 rounded-full bg-white px-4 py-2 text-sm font-semibold text-sky-700 shadow-sm ring-1 ring-sky-100">
            <ShieldCheck className="h-4 w-4" /> BlueMoon Management
          </div>
          <h1 className="max-w-2xl text-4xl font-black leading-tight tracking-tight text-slate-950">
            Quản lý chung cư BlueMoon
          </h1>

          <div className="mt-8 grid max-w-xl grid-cols-3 gap-4">
            {["Tiện nghi", "Hiện đại", "Sang trọng"].map((item) => (
              <Card key={item} className="bg-white/75 text-center backdrop-blur">
                <div className="text-xl font-black text-sky-700">{item}</div>
                <div className="mt-1 text-xs text-slate-500">BlueMoon</div>
              </Card>
            ))}
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="rounded-3xl border border-white/80 bg-white/90 p-6 shadow-2xl shadow-sky-100 backdrop-blur">
          <div className="mb-7 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-600 text-white shadow-lg shadow-sky-200">
              <Building2 className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-slate-900">BlueMoon</h2>
              <p className="text-sm text-slate-500">Phần mềm quản chung cư</p>
            </div>
          </div>

          {showTabs && (
            <div className="mb-5 grid grid-cols-2 rounded-2xl bg-slate-100 p-1">
              <button
                type="button"
                onClick={() => navigate("/login")}
                className={`rounded-xl px-3 py-2 text-sm font-bold ${isLogin ? "bg-white text-sky-700 shadow-sm" : "text-slate-500"}`}
              >
                Đăng nhập
              </button>
              <button
                type="button"
                onClick={() => navigate("/register")}
                className={`rounded-xl px-3 py-2 text-sm font-bold ${isRegister ? "bg-white text-sky-700 shadow-sm" : "text-slate-500"}`}
              >
                Đăng ký
              </button>
            </div>
          )}

          {subtitle && <div className="mb-4 text-sm font-semibold text-slate-600">{subtitle}</div>}

          {children}
        </motion.div>
      </div>
    </div>
  );
}

// Khối thông báo lỗi / thành công dùng chung.
export function AuthError({ children }) {
  if (!children) return null;
  return (
    <div className="rounded-xl bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 ring-1 ring-rose-200">
      {children}
    </div>
  );
}

export function AuthInfo({ children }) {
  if (!children) return null;
  return (
    <div className="mb-4 rounded-xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700 ring-1 ring-emerald-200">
      {children}
    </div>
  );
}
