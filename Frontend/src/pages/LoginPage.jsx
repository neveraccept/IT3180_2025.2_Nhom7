import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Building2, Users, WalletCards, Car, Bike, ReceiptText, Bell, MessageSquareWarning, BarChart3, Home, ShieldCheck, Search, Plus, Download, LogOut, Menu, X, CheckCircle2, Clock3, AlertCircle, UserRoundCog, KeyRound, MapPin, Phone, Mail, CalendarDays, Sparkles, HeartHandshake, Dumbbell, Waves, Gamepad2, ShoppingCart, Trees
} from "lucide-react";
import { useAppContext } from "../context/AppContext";
import { useDatabaseState } from "../hooks/useDatabaseState";
import {
  adminNav,
  residentNav,
  apartments,
  residents,
  fees,
  payments,
  initialVehicles,
  initialUtilities,
  complaints,
  notifications,
  users,
  initialRegistrations,
  initialFeeCatalog,
} from "../data/mockData";
import {
  money,
  normalizeNotifications,
  getHouseholds,
  calculateMandatoryAmount,
  calculatePaymentStatus,
  makePaymentKey,
  buildPaymentRecordsForFee,
  buildInitialPaymentRecords,
  adminBankInfo,
  getResidentRoomByUser,
  getResidentDisplayName,
  parseNumberValue,
  getUtilityName,
  getUtilityUnitText,
  buildHouseholdBillRows,
  getPeriodSummaryText,
} from "../utils/helpers";
import {
  Badge,
  Button,
  Card,
  StatusBadge,
  DataTable,
  Input,
  Select,
  NotificationDetailModal,
  ComplaintReadOnlyModal,
  PaymentQRModal,
} from "../components/common";
import { SectionHeader } from "../components/layout/SectionHeader";
import { loginAPI, registerAPI, approveRegistrationAPI, rejectRegistrationAPI } from "../config/api";

export function Login({ setUser, initialMode = "login", onBackIntro, registrations = [], setRegistrations }) {
  const [mode, setMode] = useState(initialMode);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  
  // Register form states
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [apartment, setApartment] = useState("");
  const [registerSuccess, setRegisterSuccess] = useState(false);

  const handleLogin = async () => {
    if (!username || !password) {
      setError("Vui lòng nhập tên đăng nhập và mật khẩu");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const result = await loginAPI(username, password);

      if (result.success) {
        setUser({
          ...result.user,
          username: result.user.username,
          name: result.user.name || result.user.fullName || result.user.username,
          fullName: result.user.fullName || result.user.name || result.user.username,
          role: result.user.role,
          token: result.token,
        });
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

  const handleRegister = async () => {
    const cleanFullName = fullName.trim();
    const cleanUsername = username.trim();
    const cleanPassword = password.trim();
    const cleanConfirmPassword = confirmPassword.trim();
    const cleanEmail = email.trim();
    const cleanPhone = phone.trim();
    const cleanApartment = apartment.trim();

    if (!cleanFullName || !cleanUsername || !cleanPassword || !cleanConfirmPassword || !cleanEmail || !cleanPhone || !cleanApartment) {
      setError("Vui lòng nhập đầy đủ thông tin");
      return;
    }

    if (cleanPassword !== cleanConfirmPassword) {
      setError("Mật khẩu nhập lại không khớp");
      return;
    }

    const existedRegistration = registrations.some(
      (item) =>
        item.username?.toLowerCase() === cleanUsername.toLowerCase() &&
        item.status !== "rejected"
    );

    if (existedRegistration) {
      setError("Tên đăng nhập này đã gửi đăng ký hoặc đã được duyệt.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      // Lưu đăng ký vào danh sách chờ duyệt của Admin.
      // Đây là database mô phỏng bằng localStorage thông qua useDatabaseState ở AppContent.
      const newRegistration = {
        id: Date.now(),
        fullName: cleanFullName,
        username: cleanUsername,
        password: cleanPassword,
        email: cleanEmail,
        phone: cleanPhone,
        apartment: cleanApartment,
        status: "pending",
        createdAt: new Date().toLocaleDateString("vi-VN"),
      };

      setRegistrations((prev) => [newRegistration, ...prev]);

      // Gọi API nếu backend có cấu hình; nếu chưa có backend thì vẫn đã lưu vào danh sách duyệt.
      try {
        await registerAPI(cleanFullName, cleanUsername, cleanPassword, cleanEmail, cleanPhone, cleanApartment);
      } catch (apiError) {
        console.warn("Register API chưa kết nối, đã lưu đăng ký vào localStorage:", apiError);
      }

      setRegisterSuccess(true);

      setFullName("");
      setUsername("");
      setPassword("");
      setConfirmPassword("");
      setEmail("");
      setPhone("");
      setApartment("");

      setTimeout(() => {
        setMode("login");
        setRegisterSuccess(false);
      }, 3000);
    } catch (err) {
      setError("Lỗi khi lưu đăng ký. Vui lòng thử lại.");
      console.error("Register error:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-sky-50 via-white to-indigo-50 p-4">
      {onBackIntro && (
        <button onClick={onBackIntro} className="absolute left-5 top-5 z-20 rounded-xl bg-white/85 px-4 py-2 text-sm font-bold text-sky-700 shadow-sm ring-1 ring-sky-100 hover:bg-white">
          ← Về trang giới thiệu
        </button>
      )}
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

          <div className="mb-5 grid grid-cols-2 rounded-2xl bg-slate-100 p-1">
            <button onClick={() => { setMode("login"); setError(""); setConfirmPassword(""); }} className={`rounded-xl px-3 py-2 text-sm font-bold ${mode === "login" ? "bg-white text-sky-700 shadow-sm" : "text-slate-500"}`}>Đăng nhập</button>
            <button onClick={() => { setMode("register"); setError(""); setRegisterSuccess(false); }} className={`rounded-xl px-3 py-2 text-sm font-bold ${mode === "register" ? "bg-white text-sky-700 shadow-sm" : "text-slate-500"}`}>Đăng ký</button>
          </div>

          {registerSuccess && (
            <div className="mb-4 rounded-xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700 ring-1 ring-emerald-200">
              ✓ Đăng ký thành công! Yêu cầu đã được gửi vào mục Duyệt Đăng Ký của Admin.
            </div>
          )}

          <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); if (mode === "login") handleLogin(); else handleRegister(); }}>
            {mode === "register" && (
              <>
                <div className="grid gap-4 md:grid-cols-2">
                  <Input 
                    label="Họ tên" 
                    placeholder="Nguyễn Văn A"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                  />
                  <Input 
                    label="Mã căn hộ" 
                    placeholder="1201"
                    value={apartment}
                    onChange={(e) => setApartment(e.target.value)}
                  />
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <Input 
                    label="Email" 
                    type="email"
                    placeholder="name@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                  <Input 
                    label="Số điện thoại" 
                    placeholder="09xxxxxxxx"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>
              </>
            )}
            <Input 
              label="Tên đăng nhập" 
              placeholder={mode === "login" ? "Nhập tên đăng nhập" : "Nhập tên đăng nhập"}
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
            {mode === "register" && (
              <Input
                label="Nhập lại mật khẩu"
                type="password"
                placeholder="Nhập lại mật khẩu"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            )}
            {error && <div className="rounded-xl bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 ring-1 ring-rose-200">{error}</div>}
            <Button 
              className="w-full py-3" 
              onClick={() => { if (mode === "login") handleLogin(); else handleRegister(); }}
              disabled={loading}
            >
              {loading ? "Đang xử lý..." : mode === "login" ? "Đăng nhập" : "Đăng ký"}
            </Button>
          </form>
        </motion.div>
      </div>
    </div>
  );
}
