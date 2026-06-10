// ============================================================
//  AuthShell — khung giao diện dùng chung cho các trang xác thực
//  (Login / Register / ForgotPassword / OtpVerify).
//  Giữ nguyên bố cục & class Tailwind từ thiết kế gốc.
// ============================================================
import { motion } from "framer-motion";
import { Building2, ShieldCheck, Users, Wallet, Bell, BarChart3, ArrowLeft } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";

// Điểm nổi bật hiển thị ở cột trái — thay cho 3 thẻ chữ đơn điệu cũ.
const HIGHLIGHTS = [
  { icon: Users, title: "Quản lý cư dân", desc: "Hộ khẩu, nhân khẩu & căn hộ tập trung" },
  { icon: Wallet, title: "Thu phí minh bạch", desc: "Hóa đơn, thanh toán VNPay tức thì" },
  { icon: Bell, title: "Thông báo tức thời", desc: "Gửi tin tới toàn bộ cư dân chỉ 1 chạm" },
  { icon: BarChart3, title: "Báo cáo trực quan", desc: "Thống kê thu chi, xuất Excel & PDF" },
];

export function AuthShell({ children, showTabs = false, subtitle }) {
  const navigate = useNavigate();
  const location = useLocation();
  const isLogin = location.pathname === "/login";
  const isRegister = location.pathname === "/register";

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-slate-50 via-sky-50 to-indigo-100 p-4">
      {/* Khối ánh sáng trang trí nền */}
      <div className="pointer-events-none absolute -left-32 -top-32 h-96 w-96 rounded-full bg-sky-300/40 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 right-0 h-[28rem] w-[28rem] rounded-full bg-indigo-300/40 blur-3xl" />
      <div className="pointer-events-none absolute left-1/2 top-1/3 h-72 w-72 -translate-x-1/2 rounded-full bg-cyan-200/30 blur-3xl" />

      <button
        onClick={() => navigate("/")}
        className="absolute left-5 top-5 z-20 inline-flex items-center gap-1.5 rounded-xl bg-white/80 px-4 py-2 text-sm font-bold text-sky-700 shadow-sm ring-1 ring-white/60 backdrop-blur transition hover:bg-white hover:shadow-md"
      >
        <ArrowLeft className="h-4 w-4" /> Về trang giới thiệu
      </button>

      <div className="relative mx-auto grid min-h-[calc(100vh-32px)] max-w-6xl items-center gap-10 lg:grid-cols-[1.05fr_0.95fr]">
        {/* ===== Cột trái: giới thiệu thương hiệu ===== */}
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="hidden lg:block"
        >
          <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-white/70 px-4 py-2 text-sm font-semibold text-sky-700 shadow-sm ring-1 ring-white/60 backdrop-blur">
            <ShieldCheck className="h-4 w-4" /> BlueMoon Management
          </div>

          <h1 className="max-w-xl text-5xl font-black leading-[1.1] tracking-tight text-slate-900">
            Quản lý chung cư{" "}
            <span className="bg-gradient-to-r from-sky-600 to-indigo-600 bg-clip-text text-transparent">
              BlueMoon
            </span>
          </h1>
          <p className="mt-4 max-w-md text-base leading-relaxed text-slate-600">
            Giải pháp số hóa toàn diện cho ban quản trị: vận hành nhanh chóng, minh bạch và
            chuyên nghiệp trên một nền tảng duy nhất.
          </p>

          <div className="mt-8 grid max-w-xl grid-cols-2 gap-4">
            {HIGHLIGHTS.map(({ icon: Icon, title, desc }, i) => (
              <motion.div
                key={title}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 + i * 0.08, duration: 0.4 }}
                className="group rounded-2xl border border-white/70 bg-white/70 p-4 shadow-sm backdrop-blur transition hover:-translate-y-0.5 hover:bg-white hover:shadow-lg hover:shadow-sky-100"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 to-indigo-500 text-white shadow-sm shadow-sky-200">
                  <Icon className="h-5 w-5" />
                </div>
                <div className="mt-3 text-sm font-bold text-slate-900">{title}</div>
                <div className="mt-0.5 text-xs leading-relaxed text-slate-500">{desc}</div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* ===== Cột phải: thẻ xác thực ===== */}
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="relative overflow-hidden rounded-3xl border border-white/80 bg-white/90 p-7 shadow-2xl shadow-sky-200/60 backdrop-blur"
        >
          {/* Dải gradient trang trí phía trên thẻ */}
          <div className="pointer-events-none absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-sky-500 via-indigo-500 to-cyan-400" />

          <div className="mb-7 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-600 to-indigo-600 text-white shadow-lg shadow-sky-300/60">
              <Building2 className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-2xl font-black tracking-tight text-slate-900">BlueMoon</h2>
              <p className="text-sm text-slate-500">Phần mềm quản lý chung cư</p>
            </div>
          </div>

          {showTabs && (
            <div className="mb-5 grid grid-cols-2 rounded-2xl bg-slate-100 p-1">
              <button
                type="button"
                onClick={() => navigate("/login")}
                className={`rounded-xl px-3 py-2 text-sm font-bold transition ${isLogin ? "bg-white text-sky-700 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
              >
                Đăng nhập
              </button>
              <button
                type="button"
                onClick={() => navigate("/register")}
                className={`rounded-xl px-3 py-2 text-sm font-bold transition ${isRegister ? "bg-white text-sky-700 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
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
