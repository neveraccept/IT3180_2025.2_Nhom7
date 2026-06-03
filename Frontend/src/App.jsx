import React, { useMemo, useState } from "react";
import { loginAPI, registerAPI, approveRegistrationAPI, rejectRegistrationAPI } from "./config/api";
import { AppProvider, useAppContext } from "./context/AppContext";
import {
  Building2,
  Users,
  WalletCards,
  Car,
  ReceiptText,
  Bell,
  MessageSquareWarning,
  BarChart3,
  Home,
  ShieldCheck,
  Search,
  Plus,
  Download,
  LogOut,
  Menu,
  X,
  CheckCircle2,
  Clock3,
  AlertCircle,
  UserRoundCog,
  KeyRound,
} from "lucide-react";
import { motion } from "framer-motion";

const money = (value) => new Intl.NumberFormat("vi-VN").format(value) + " đ";

const adminNav = [
  { key: "dashboard", label: "Dashboard", icon: Home },
  { key: "registrations", label: "Duyệt Đăng Ký", icon: CheckCircle2 },
  { key: "accounts", label: "Tài khoản", icon: UserRoundCog },
  { key: "apartments", label: "Căn hộ", icon: Building2 },
  { key: "residents", label: "Nhân khẩu", icon: Users },
  { key: "fees", label: "Khoản thu", icon: WalletCards },
  { key: "payments", label: "Thu phí", icon: ReceiptText },
  { key: "vehicles", label: "Gửi xe", icon: Car },
  { key: "utilities", label: "Điện/Nước/Internet", icon: ReceiptText },
  { key: "complaints", label: "Khiếu nại", icon: MessageSquareWarning },
  { key: "notifications", label: "Thông báo", icon: Bell },
  { key: "statistics", label: "Thống kê", icon: BarChart3 },
];

const residentNav = [
  { key: "dashboard", label: "Dashboard", icon: Home },
  { key: "myFees", label: "Khoản phí của tôi", icon: WalletCards },
  { key: "complaints", label: "Khiếu nại của tôi", icon: MessageSquareWarning },
  { key: "notifications", label: "Thông báo", icon: Bell },
  { key: "profile", label: "Thông tin cá nhân", icon: KeyRound },
];

const apartments = [
  { code: "1201", floor: 12, area: 76, status: "OCCUPIED", owner: "Nguyễn Minh Anh", members: 4 },
  { code: "1202", floor: 12, area: 68, status: "AVAILABLE", owner: "—", members: 0 },
  { code: "1808", floor: 18, area: 92, status: "OCCUPIED", owner: "Trần Quốc Bảo", members: 5 },
  { code: "2405", floor: 24, area: 81, status: "OCCUPIED", owner: "Lê Hoài Nam", members: 3 },
];

const residents = [
  { name: "Nguyễn Minh Anh", room: "1201", birthYear: "1985", idCard: "001201xxxx", relation: "Chủ hộ", status: "PERMANENT" },
  { name: "Phạm Lan Hương", room: "1201", birthYear: "1988", idCard: "001202xxxx", relation: "Vợ", status: "PERMANENT" },
  { name: "Trần Quốc Bảo", room: "1808", birthYear: "1982", idCard: "001203xxxx", relation: "Chủ hộ", status: "TEMPORARY" },
  { name: "Lê Hoài Nam", room: "2405", birthYear: "1980", idCard: "001204xxxx", relation: "Chủ hộ", status: "PERMANENT" },
];

const fees = [
  { name: "Phí quản lý tháng 05/2026", type: "MANDATORY", unit: "PER_M2", price: 7000, status: "ACTIVE" },
  { name: "Phí dịch vụ tháng 05/2026", type: "MANDATORY", unit: "PER_M2", price: 12000, status: "ACTIVE" },
  { name: "Quỹ vì người nghèo", type: "DONATION", unit: "NONE", price: 0, status: "ACTIVE" },
];

const payments = [
  { room: "1201", owner: "Nguyễn Minh Anh", due: 1452000, paid: 1452000, status: "PAID" },
  { room: "1808", owner: "Trần Quốc Bảo", due: 1756000, paid: 1756000, status: "PAID" },
  { room: "2405", owner: "Lê Hoài Nam", due: 1539000, paid: 0, status: "UNPAID" },
];

const initialVehicles = [
  { name: "Trần Quốc Bảo", birthYear: "1982", idCard: "001203xxxx", plate: "30A-12345", type: "Ô tô", room: "1808", fee: 1200000, slot: "B1-12", status: "USED" },
  { name: "Nguyễn Minh Anh", birthYear: "1985", idCard: "001201xxxx", plate: "29X1-22222", type: "Xe máy", room: "1201", fee: 70000, slot: "M-08", status: "USED" },
  { name: "Lê Hoài Nam", birthYear: "1980", idCard: "001204xxxx", plate: "38A-56789", type: "Ô tô", room: "2405", fee: 1500000, slot: "B2-09", status: "USED" },
];

const initialUtilities = [
  {
    id: 1,
    room: "1201",
    type: "ELECTRICITY",
    month: 5,
    year: 2026,
    oldIndex: 1240,
    newIndex: 1322,
    status: "PAID",
  },
  {
    id: 2,
    room: "1201",
    type: "WATER",
    month: 5,
    year: 2026,
    oldIndex: 310,
    newIndex: 322,
    status: "UNPAID",
  },
  {
    id: 3,
    room: "1808",
    type: "INTERNET",
    month: 5,
    year: 2026,
    oldIndex: "__",
    newIndex: "__",
    status: "PAID",
  },
];

const complaints = [
  {
    id: "KN-001",
    title: "Thắc mắc phí gửi xe",
    sender: "Căn 1201",
    category: "Phí",
    content: "Gia đình tôi muốn kiểm tra lại khoản phí gửi xe tháng này vì số tiền cao hơn tháng trước.",
    response: "",
    status: "IN_PROGRESS",
  },
  {
    id: "KN-002",
    title: "Đèn hành lang tầng 18 hỏng",
    sender: "Căn 1808",
    category: "An ninh",
    content: "Đèn hành lang gần thang máy tầng 18 bị hỏng, buổi tối khá tối và khó quan sát.",
    response: "Đã chuyển bộ phận kỹ thuật kiểm tra và thay bóng đèn.",
    status: "IN_PROGRESS",
  },
  {
    id: "KN-003",
    title: "Vệ sinh khu đổ rác",
    sender: "Căn 2405",
    category: "Vệ sinh",
    content: "Khu vực đổ rác tầng 24 có mùi khó chịu, đề nghị tăng tần suất vệ sinh.",
    response: "Ban quản trị đã nhắc đơn vị vệ sinh tăng cường dọn dẹp khu vực này.",
    status: "RESOLVED",
  },
];

const notifications = [
  { title: "Thông báo thu phí dịch vụ tháng 05/2026", scope: "Toàn chung cư", date: "27/05/2026", read: false },
  { title: "Bảo trì thang máy khu A", scope: "Theo tầng", date: "25/05/2026", read: true },
  { title: "Nhắc lịch họp cư dân", scope: "Toàn chung cư", date: "20/05/2026", read: true },
];

// Danh sách tài khoản hệ thống
const users = [
  { username: "admin", password: "admin123", name: "Admin BlueMoon", role: "ADMIN" },
  { username: "admin2", password: "12345", name: "Admin Phó", role: "ADMIN" },
  { username: "resident1", password: "resident123", name: "Nguyễn Minh Anh", role: "RESIDENT" },
  { username: "resident2", password: "baolmuh", name: "Trần Quốc Bảo", role: "RESIDENT" },
  { username: "resident3", password: "hoainiem", name: "Lê Hoài Nam", role: "RESIDENT" },
];

const initialRegistrations = [
  {
    id: 1,
    fullName: "Phạm Minh Trí",
    username: "minhtri",
    email: "minhtri@email.com",
    phone: "0912345678",
    apartment: "1101",
    status: "pending",
    createdAt: "28/05/2026",
  },
];

const normalizeNotifications = (source) =>
  source.map((item, index) => ({
    id: item.id || index + 1,
    title: item.title,
    content:
      item.content ||
      `Nội dung chi tiết của thông báo: ${item.title}. Vui lòng cư dân chú ý theo dõi và thực hiện đúng theo thông báo từ Ban quản trị BlueMoon.`,
    scope: item.scope,
    date: item.date,
    read: Boolean(item.read),
  }));

const initialFeeCatalog = [
  {
    id: "FEE-MANAGEMENT",
    name: "Phí quản lý chung cư",
    type: "MANDATORY",
    chargeMethod: "PER_M2",
    unitPrice: 7000,
    description: "Thu theo diện tích căn hộ, tính hàng tháng.",
    status: "ACTIVE",
  },
  {
    id: "FEE-SERVICE",
    name: "Phí dịch vụ chung cư",
    type: "MANDATORY",
    chargeMethod: "PER_M2",
    unitPrice: 12000,
    description: "Phí vệ sinh, bảo vệ, vận hành khu chung.",
    status: "ACTIVE",
  },
  {
    id: "FEE-FUND",
    name: "Quỹ vì người nghèo",
    type: "DONATION",
    chargeMethod: "DONATION",
    unitPrice: 0,
    description: "Khoản đóng góp tự nguyện, cư dân nộp bao nhiêu ghi nhận bấy nhiêu.",
    status: "ACTIVE",
  },
];

const getHouseholds = () =>
  apartments
    .filter((apartment) => apartment.status === "OCCUPIED")
    .map((apartment) => ({
      room: apartment.code,
      owner: apartment.owner,
      floor: apartment.floor,
      area: apartment.area,
    }));

const calculateMandatoryAmount = (fee, household) => {
  if (!fee || fee.type !== "MANDATORY" || fee.status !== "ACTIVE") return 0;
  if (fee.chargeMethod === "PER_M2") return Math.round(Number(household.area || 0) * Number(fee.unitPrice || 0));
  if (fee.chargeMethod === "FIXED") return Number(fee.unitPrice || 0);
  return 0;
};

const calculatePaymentStatus = (amountDue, amountPaid) =>
  Number(amountPaid || 0) >= Number(amountDue || 0) && Number(amountDue || 0) > 0 ? "PAID" : "UNPAID";

const makePaymentKey = (feeId, room, month, year) => `${feeId}-${room}-${month}-${year}`;

const buildPaymentRecordsForFee = (fee, month, year, existingRecords = []) => {
  if (!fee || fee.type !== "MANDATORY" || fee.status !== "ACTIVE") return [];

  return getHouseholds()
    .filter((household) => !existingRecords.some((record) => record.key === makePaymentKey(fee.id, household.room, month, year)))
    .map((household) => {
      const amountDue = calculateMandatoryAmount(fee, household);

      return {
        id: `PAY-${fee.id}-${household.room}-${month}-${year}`,
        key: makePaymentKey(fee.id, household.room, month, year),
        feeId: fee.id,
        feeName: fee.name,
        chargeMethod: fee.chargeMethod,
        unitPrice: Number(fee.unitPrice || 0),
        room: household.room,
        owner: household.owner,
        area: household.area,
        month,
        year,
        amountDue,
        amountPaid: 0,
        paidDate: "",
        note: "",
        status: "UNPAID",
        history: [],
      };
    });
};

const buildInitialPaymentRecords = (feesSource, month = 5, year = 2026) =>
  feesSource.flatMap((fee) => buildPaymentRecordsForFee(fee, month, year, []));

function useDatabaseState(key, fallbackValue) {
  const [value, setValueState] = useState(() => {
    try {
      const saved = localStorage.getItem(key);
      return saved ? JSON.parse(saved) : fallbackValue;
    } catch {
      return fallbackValue;
    }
  });

  const setValue = (updater) => {
    setValueState((prev) => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      try {
        localStorage.setItem(key, JSON.stringify(next));
      } catch {
        // Nếu trình duyệt chặn localStorage thì vẫn giữ dữ liệu trong state.
      }
      return next;
    });
  };

  return [value, setValue];
}


function Badge({ children, tone = "gray" }) {
  const tones = {
    green: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    blue: "bg-sky-50 text-sky-700 ring-sky-200",
    yellow: "bg-amber-50 text-amber-700 ring-amber-200",
    red: "bg-rose-50 text-rose-700 ring-rose-200",
    gray: "bg-slate-100 text-slate-700 ring-slate-200",
    violet: "bg-violet-50 text-violet-700 ring-violet-200",
  };
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${tones[tone]}`}>{children}</span>;
}

function Button({ children, variant = "primary", className = "", disabled = false, ...props }) {
  const variants = {
    primary: "bg-sky-600 text-white hover:bg-sky-700 shadow-sm shadow-sky-100 disabled:bg-sky-400 disabled:cursor-not-allowed",
    secondary: "bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50 disabled:bg-slate-50 disabled:cursor-not-allowed",
    danger: "bg-rose-600 text-white hover:bg-rose-700 disabled:bg-rose-400 disabled:cursor-not-allowed",
    soft: "bg-sky-50 text-sky-700 hover:bg-sky-100 disabled:bg-sky-50 disabled:cursor-not-allowed",
  };
  return (
    <button 
      className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition ${variants[variant]} ${className}`} 
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
}

function Card({ children, className = "" }) {
  return <div className={`rounded-2xl border border-slate-200 bg-white p-5 shadow-sm ${className}`}>{children}</div>;
}

function SectionHeader({ title, desc, action }) {
  return (
    <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">{title}</h2>
        {desc && <p className="mt-1 text-sm text-slate-500">{desc}</p>}
      </div>
      {action}
    </div>
  );
}

function StatusBadge({ status }) {
  const map = {
    OCCUPIED: ["Đang ở", "green"],
    AVAILABLE: ["Đang trống", "blue"],
    PERMANENT: ["Thường trú", "green"],
    TEMPORARY: ["Tạm trú", "blue"],
    ABSENT: ["Tạm vắng", "yellow"],
    MANDATORY: ["Bắt buộc", "red"],
    DONATION: ["Tự nguyện", "violet"],
    PAID: ["Đã nộp", "green"],
    UNPAID: ["Chưa nộp", "red"],
    NEW: ["Mới gửi", "red"],
    IN_PROGRESS: ["Đang xử lý", "yellow"],
    RESOLVED: ["Đã giải quyết", "green"],
    ACTIVE: ["Đang dùng", "green"],
    ENDED: ["Kết thúc", "gray"],
  };
  const [label, tone] = map[status] || [status, "gray"];
  return <Badge tone={tone}>{label}</Badge>;
}

function DataTable({ columns, rows }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
            <tr>
              {columns.map((c) => (
                <th key={c.key} className="px-5 py-4">{c.label}</th>
              ))}
              <th className="px-5 py-4 text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((row, idx) => (
              <tr key={idx} className="hover:bg-slate-50/80">
                {columns.map((c) => (
                  <td key={c.key} className="whitespace-nowrap px-5 py-4 text-slate-700">
                    {c.render ? c.render(row) : row[c.key]}
                  </td>
                ))}
                <td className="px-5 py-4 text-right">
                  <button className="font-semibold text-sky-700 hover:text-sky-900">Chi tiết</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Login({ setUser }) {
  const [mode, setMode] = useState("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
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
          username: result.user.username,
          name: result.user.name,
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
    if (!fullName || !username || !password || !email || !phone || !apartment) {
      setError("Vui lòng nhập đầy đủ thông tin");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const result = await registerAPI(fullName, username, password, email, phone, apartment);

      if (result.success) {
        setRegisterSuccess(true);
        // Reset form
        setFullName("");
        setUsername("");
        setPassword("");
        setEmail("");
        setPhone("");
        setApartment("");
        
        // Hiển thị thông báo thành công
        setTimeout(() => {
          setMode("login");
          setRegisterSuccess(false);
        }, 3000);
      } else {
        setError(result.message);
      }
    } catch (err) {
      setError("Lỗi kết nối server. Vui lòng thử lại.");
      console.error("Register error:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-white to-indigo-50 p-4">
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
            <button onClick={() => { setMode("login"); setError(""); }} className={`rounded-xl px-3 py-2 text-sm font-bold ${mode === "login" ? "bg-white text-sky-700 shadow-sm" : "text-slate-500"}`}>Đăng nhập</button>
            <button onClick={() => { setMode("register"); setError(""); setRegisterSuccess(false); }} className={`rounded-xl px-3 py-2 text-sm font-bold ${mode === "register" ? "bg-white text-sky-700 shadow-sm" : "text-slate-500"}`}>Đăng ký</button>
          </div>

          {registerSuccess && (
            <div className="mb-4 rounded-xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700 ring-1 ring-emerald-200">
              ✓ Đăng ký thành công! Admin sẽ duyệt yêu cầu của bạn trong thời gian sớm nhất.
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

function Input({ label, className = "", ...props }) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1.5 block text-sm font-semibold text-slate-700">{label}</span>
      <input className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-sky-400 focus:ring-4 focus:ring-sky-100" {...props} />
    </label>
  );
}

function Select({ label, children, value, onChange }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-semibold text-slate-700">{label}</span>
      <select className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100" value={value} onChange={onChange}>
        {children}
      </select>
    </label>
  );
}

function Layout({
  user,
  setUser,
  registrations,
  setRegistrations,
  feesList,
  setFeesList,
  paymentRecords,
  setPaymentRecords,
  syncPaymentsForMandatoryFee,
  removePaymentsForFee,
  complaintsList,
  setComplaintsList,
  notificationList,
  setNotificationList,
}) {
  const nav = user.role === "ADMIN" ? adminNav : residentNav;
  const [active, setActive] = useState("dashboard");
  const [open, setOpen] = useState(false);
  const [dashboardTarget, setDashboardTarget] = useState({ complaintId: null, notificationId: null });

  const openComplaintFromDashboard = (complaintId) => {
    setDashboardTarget({ complaintId, notificationId: null });
    setActive("complaints");
  };

  const openNotificationFromDashboard = (notificationId) => {
    setDashboardTarget({ complaintId: null, notificationId });
    setActive("notifications");
  };

  const clearDashboardTarget = () => {
    setDashboardTarget({ complaintId: null, notificationId: null });
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <aside className={`fixed inset-y-0 left-0 z-40 w-72 transform border-r border-slate-200 bg-white transition lg:translate-x-0 ${open ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="flex h-16 items-center justify-between border-b border-slate-100 px-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-sky-600 text-white">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <div className="font-black">BlueMoon</div>
              <div className="text-xs text-slate-500">Thu phí chung cư</div>
            </div>
          </div>
          <button className="lg:hidden" onClick={() => setOpen(false)}><X className="h-5 w-5" /></button>
        </div>
        <nav className="space-y-1 p-4">
          {nav.map((item) => {
            const Icon = item.icon;
            const selected = active === item.key;
            return (
              <button
                key={item.key}
                onClick={() => {
                  setActive(item.key);
                  setOpen(false);
                  clearDashboardTarget();
                }}
                className={`flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-bold transition ${selected ? "bg-sky-50 text-sky-700 ring-1 ring-sky-100" : "text-slate-600 hover:bg-slate-50"}`}
              >
                <Icon className="h-5 w-5" />
                {item.label}
              </button>
            );
          })}
        </nav>
      </aside>

      <main className="lg:pl-72">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200 bg-white/85 px-4 backdrop-blur md:px-8">
          <div className="flex items-center gap-3">
            <button className="rounded-xl p-2 hover:bg-slate-100 lg:hidden" onClick={() => setOpen(true)}><Menu className="h-5 w-5" /></button>
            <div>
              <div className="text-sm text-slate-500">Xin chào,</div>
              <div className="font-black">{user.name}</div>
            </div>
            <Badge tone={user.role === "ADMIN" ? "blue" : "green"}>{user.role}</Badge>
          </div>
          <Button variant="secondary" onClick={() => setUser(null)}><LogOut className="h-4 w-4" /> Đăng xuất</Button>
        </header>
        <div className="p-4 md:p-8">
          <Page
            active={active}
            role={user.role}
            registrations={registrations}
            setRegistrations={setRegistrations}
            feesList={feesList}
            setFeesList={setFeesList}
            paymentRecords={paymentRecords}
            setPaymentRecords={setPaymentRecords}
            syncPaymentsForMandatoryFee={syncPaymentsForMandatoryFee}
            removePaymentsForFee={removePaymentsForFee}
            complaintsList={complaintsList}
            setComplaintsList={setComplaintsList}
            notificationList={notificationList}
            setNotificationList={setNotificationList}
            dashboardTarget={dashboardTarget}
            onDashboardTargetHandled={clearDashboardTarget}
            onOpenComplaint={openComplaintFromDashboard}
            onOpenNotification={openNotificationFromDashboard}
          />
        </div>
      </main>
    </div>
  );
}

function Page({
  active,
  role,
  registrations,
  setRegistrations,
  feesList,
  setFeesList,
  paymentRecords,
  setPaymentRecords,
  syncPaymentsForMandatoryFee,
  removePaymentsForFee,
  complaintsList,
  setComplaintsList,
  notificationList,
  setNotificationList,
  dashboardTarget,
  onDashboardTargetHandled,
  onOpenComplaint,
  onOpenNotification,
}) {
  if (active === "dashboard") {
    return (
      <Dashboard
        role={role}
        complaintsList={complaintsList}
        notificationList={notificationList}
        onOpenComplaint={onOpenComplaint}
        onOpenNotification={onOpenNotification}
      />
    );
  }
  if (active === "registrations") return <Registrations registrations={registrations} setRegistrations={setRegistrations} />;
  if (active === "accounts") return <Accounts registrations={registrations} />;
  if (active === "apartments") return <Apartments />;
  if (active === "residents") return <Residents />;
  if (active === "fees") {
    return (
      <Fees
        feesList={feesList}
        setFeesList={setFeesList}
        syncPaymentsForMandatoryFee={syncPaymentsForMandatoryFee}
        removePaymentsForFee={removePaymentsForFee}
      />
    );
  }
  if (active === "payments") {
    return (
      <Payments
        feesList={feesList}
        paymentRecords={paymentRecords}
        setPaymentRecords={setPaymentRecords}
      />
    );
  }
  if (active === "vehicles") return <Vehicles />;
  if (active === "utilities") return <Utilities />;
  if (active === "complaints") {
    return (
      <Complaints
        role={role}
        complaintsList={complaintsList}
        setComplaintsList={setComplaintsList}
        initialComplaintId={dashboardTarget.complaintId}
        onInitialComplaintHandled={onDashboardTargetHandled}
      />
    );
  }
  if (active === "notifications") {
    return (
      <Notifications
        role={role}
        notificationList={notificationList}
        setNotificationList={setNotificationList}
        initialNotificationId={dashboardTarget.notificationId}
        onInitialNotificationHandled={onDashboardTargetHandled}
      />
    );
  }
  if (active === "statistics") return <Statistics />;
  if (active === "myFees") return <MyFees />;
  if (active === "profile") return <Profile />;
  return (
    <Dashboard
      role={role}
      complaintsList={complaintsList}
      notificationList={notificationList}
      onOpenComplaint={onOpenComplaint}
      onOpenNotification={onOpenNotification}
    />
  );
}

function Registrations({ registrations, setRegistrations }) {
  const { addUser, users: accountUsers = [] } = useAppContext();
  const regs = registrations;
  const setRegs = setRegistrations;
  const [loading, setLoading] = useState(false);
  const [rejectingId, setRejectingId] = useState(null);
  const [rejectReason, setRejectReason] = useState("");

  const handleApprove = async (id) => {
    setLoading(true);
    try {
      const reg = regs.find((r) => r.id === id);

      if (!reg) {
        return;
      }

      if (reg.status !== "pending") {
        alert("Yêu cầu này đã được xử lý rồi.");
        return;
      }

      const existedAccount = accountUsers.some((u) => u.username === reg.username);
      if (!existedAccount) {
        addUser({
          username: reg.username,
          fullName: reg.fullName,
          role: "RESIDENT",
          email: reg.email,
          phone: reg.phone,
          apartment: reg.apartment,
          active: "Hoạt động",
        });
      }

      setRegs((prev) =>
        prev.map((r) =>
          r.id === id
            ? {
                ...r,
                status: "approved",
                approvedAt: new Date().toLocaleString("vi-VN", {
                  dateStyle: "short",
                  timeStyle: "short",
                }),
              }
            : r
        )
      );

      alert("Duyệt thành công! Tài khoản đã được thêm vào phần Tài khoản.");
    } catch (err) {
      console.error("Approve error:", err);
      alert("Lỗi: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRejectSubmit = () => {
    if (!rejectReason.trim()) {
      alert("Vui lòng nhập lý do từ chối");
      return;
    }

    setRegs((prev) =>
      prev.map((r) =>
        r.id === rejectingId
          ? {
              ...r,
              status: "rejected",
              rejectReason: rejectReason.trim(),
              rejectedAt: new Date().toLocaleString("vi-VN", {
                dateStyle: "short",
                timeStyle: "short",
              }),
            }
          : r
      )
    );

    setRejectingId(null);
    setRejectReason("");
  };

  const pendingRegs = regs.filter(r => r.status === "pending");

  if (rejectingId) {
    return (
      <>
        <SectionHeader title="Duyệt Đăng Ký Cư Dân" />
        <Card className="max-w-md">
          <h3 className="mb-4 text-lg font-bold">Lý do từ chối</h3>
          <textarea 
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
            placeholder="Nhập lý do từ chối..."
            rows={4}
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
          />
          <div className="mt-4 flex gap-3">
            <Button variant="primary" onClick={handleRejectSubmit}>Xác nhận</Button>
            <Button variant="secondary" onClick={() => { setRejectingId(null); setRejectReason(""); }}>Huỷ</Button>
          </div>
        </Card>
      </>
    );
  }

  return (
    <>
      <SectionHeader title="Duyệt Đăng Ký Cư Dân" desc={`Có ${pendingRegs.length} yêu cầu chờ duyệt`} />
      
      {pendingRegs.length === 0 ? (
        <Card className="text-center py-12">
          <div className="text-slate-500 text-lg font-semibold">Không có yêu cầu đăng ký nào chờ duyệt</div>
        </Card>
      ) : (
        <div className="space-y-4">
          {pendingRegs.map((reg) => (
            <Card key={reg.id} className="border-l-4 border-l-amber-400">
              <div className="grid gap-4 md:grid-cols-[1fr_auto]">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-lg text-slate-900">{reg.fullName}</h3>
                    <Badge tone="yellow">Chờ duyệt</Badge>
                  </div>
                  <div className="grid gap-2 text-sm text-slate-600 md:grid-cols-2">
                    <div><span className="font-semibold">Username:</span> {reg.username}</div>
                    <div><span className="font-semibold">Căn hộ:</span> {reg.apartment}</div>
                    <div><span className="font-semibold">Email:</span> {reg.email}</div>
                    <div><span className="font-semibold">SĐT:</span> {reg.phone}</div>
                    <div className="md:col-span-2"><span className="font-semibold">Ngày đăng ký:</span> {reg.createdAt}</div>
                  </div>
                </div>
                <div className="flex flex-col gap-2 md:items-end">
                  <Button 
                    variant="primary" 
                    onClick={() => handleApprove(reg.id)}
                    disabled={loading}
                  >
                    <CheckCircle2 className="h-4 w-4" /> Duyệt
                  </Button>
                  <Button 
                    variant="danger" 
                    onClick={() => setRejectingId(reg.id)}
                    disabled={loading}
                  >
                    <AlertCircle className="h-4 w-4" /> Từ chối
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {regs.some(r => r.status !== "pending") && (
        <>
          <SectionHeader title="Lịch Sử Duyệt" className="mt-8" />
          <DataTable columns={[
            { key: "fullName", label: "Họ tên" },
            { key: "username", label: "Username" },
            { key: "apartment", label: "Căn hộ" },
            { key: "email", label: "Email" },
            { key: "status", label: "Trạng thái", render: (r) => <Badge tone={r.status === "approved" ? "green" : "red"}>{r.status === "approved" ? "Đã duyệt" : "Từ chối"}</Badge> },
            { key: "createdAt", label: "Ngày đăng ký" },
            { key: "approvedAt", label: "Ngày xử lý", render: (r) => r.approvedAt || r.rejectedAt || "__" },
          ]} rows={regs.filter(r => r.status !== "pending")} />
        </>
      )}
    </>
  );
}

function Dashboard({ role, complaintsList = complaints, notificationList = normalizeNotifications(notifications), onOpenComplaint, onOpenNotification }) {
  const unresolvedComplaints = complaintsList.filter((c) => c.status === "IN_PROGRESS");
  const unreadNotifications = notificationList.filter((item) => !item.read);

  const cards = role === "ADMIN"
    ? [
      { label: "Căn hộ đang ở", value: "218", icon: Building2, tone: "text-sky-700", sub: "12 căn trống" },
      { label: "Nhân khẩu", value: "726", icon: Users, tone: "text-emerald-700", sub: "18 tạm trú" },
      { label: "Đợt thu mở", value: "4", icon: WalletCards, tone: "text-violet-700", sub: "2 bắt buộc" },
      { label: "Khiếu nại đang xử lý", value: String(unresolvedComplaints.length), icon: MessageSquareWarning, tone: "text-rose-700", sub: "Cần xử lý" },
    ]
    : [
      { label: "Khoản cần nộp", value: money(452000), icon: WalletCards, tone: "text-rose-700", sub: "Tháng 05/2026" },
      { label: "Thông báo chưa đọc", value: String(unreadNotifications.length), icon: Bell, tone: "text-sky-700", sub: "Từ BQT" },
      { label: "Khiếu nại đang xử lý", value: String(unresolvedComplaints.length), icon: Clock3, tone: "text-amber-700", sub: "Theo dõi xử lý" },
    ];

  return (
    <>
      <SectionHeader title="Dashboard" desc={role === "ADMIN" ? "Tổng quan vận hành và thu phí của chung cư BlueMoon." : "Thông tin phí, thông báo và khiếu nại của hộ dân."} />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <Card key={card.label}>
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-500">{card.label}</p>
                  <p className="mt-2 text-3xl font-black text-slate-950">{card.value}</p>
                  <p className="mt-1 text-xs text-slate-500">{card.sub}</p>
                </div>
                <div className={`rounded-2xl bg-slate-50 p-3 ${card.tone}`}><Icon className="h-6 w-6" /></div>
              </div>
            </Card>
          );
        })}
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <Card>
          <h3 className="mb-4 text-lg font-black">Khiếu nại chưa xử lý</h3>
          <div className="space-y-3">
            {unresolvedComplaints.length === 0 ? (
              <div className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">✓ Không có khiếu nại chưa xử lý</div>
            ) : (
              unresolvedComplaints.map((c) => (
                <button
                  key={c.id}
                  onClick={() => onOpenComplaint?.(c.id)}
                  className="flex w-full gap-3 rounded-2xl border border-slate-200 p-4 text-left transition hover:bg-slate-50"
                >
                  <MessageSquareWarning className="mt-1 h-5 w-5 flex-shrink-0 text-amber-600" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-bold text-slate-900">{c.title}</p>
                        <p className="text-sm text-slate-500">{c.id} • {c.sender}</p>
                      </div>
                      <StatusBadge status={c.status} />
                    </div>
                    <p className="mt-2 text-xs font-medium text-slate-600">Danh mục: {c.category}</p>
                  </div>
                </button>
              ))
            )}
          </div>
        </Card>
        <Card>
          <h3 className="mb-4 text-lg font-black">Thông báo gần đây</h3>
          <div className="space-y-3">
            {notificationList.map((n) => (
              <button
                key={n.id || n.title}
                onClick={() => onOpenNotification?.(n.id)}
                className="flex w-full gap-3 rounded-2xl bg-slate-50 p-4 text-left transition hover:bg-slate-100"
              >
                <Bell className="mt-1 h-5 w-5 text-sky-600" />
                <div className="min-w-0">
                  <p className="font-bold text-slate-800">{n.title}</p>
                  <p className="text-sm text-slate-500">{n.scope} • {n.date}</p>
                </div>
              </button>
            ))}
          </div>
        </Card>
      </div>
    </>
  );
}

function Toolbar({ placeholder = "Tìm kiếm...", button = "Thêm mới" }) {
  return (
    <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
      <div className="relative max-w-md flex-1">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input placeholder={placeholder} className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm outline-none focus:border-sky-400 focus:ring-4 focus:ring-sky-100" />
      </div>
      <Button><Plus className="h-4 w-4" /> {button}</Button>
    </div>
  );
}

function Accounts({ registrations = [] }) {
  const { users, setUsers } = useAppContext();
  const approvedRegistrationAccounts = registrations
    .filter((reg) => reg.status === "approved")
    .map((reg) => ({
      username: reg.username,
      fullName: reg.fullName,
      email: reg.email,
      phone: reg.phone,
      apartment: reg.apartment,
      role: "RESIDENT",
      active: "Hoạt động",
    }));

  const accountRows = [
    ...users,
    ...approvedRegistrationAccounts.filter(
      (approved) => !users.some((user) => user.username === approved.username)
    ),
  ];
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState("");
  const [formData, setFormData] = useState({
    fullName: "",
    username: "",
    password: "",
    email: "",
    phone: "",
    role: "RESIDENT",
  });

  const handleCreate = () => {
    // Validate form
    if (!formData.fullName.trim() || !formData.username.trim() || !formData.password.trim() || !formData.email.trim() || !formData.phone.trim()) {
      setError("Vui lòng nhập đầy đủ thông tin");
      return;
    }

    // Check if username already exists
    if (users.find(u => u.username === formData.username)) {
      setError("Tên đăng nhập đã tồn tại");
      return;
    }

    // Create new user
    const newUser = {
      username: formData.username,
      fullName: formData.fullName,
      email: formData.email,
      phone: formData.phone,
      role: formData.role,
      active: "Hoạt động",
    };

    setUsers([...users, newUser]);
    
    // Reset form
    setFormData({
      fullName: "",
      username: "",
      password: "",
      email: "",
      phone: "",
      role: "RESIDENT",
    });
    setError("");
    setShowForm(false);
  };

  const handleCancel = () => {
    setFormData({
      fullName: "",
      username: "",
      password: "",
      email: "",
      phone: "",
      role: "RESIDENT",
    });
    setError("");
    setShowForm(false);
  };

  return (
    <>
      <SectionHeader title="Quản lý tài khoản" desc="Admin tạo, sửa, khoá/mở khoá và duyệt tài khoản cư dân đăng ký." action={<Button onClick={() => setShowForm(true)}><Plus className="h-4 w-4" /> Tạo tài khoản</Button>} />
      
      {showForm && (
        <Card className="mb-5">
          <h3 className="mb-4 text-lg font-bold">Tạo tài khoản mới</h3>
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Input 
                label="Họ tên" 
                placeholder="Nguyễn Văn A"
                value={formData.fullName}
                onChange={(e) => setFormData({...formData, fullName: e.target.value})}
              />
              <Select label="Vai trò" value={formData.role} onChange={(e) => setFormData({...formData, role: e.target.value})}>
                <option value="ADMIN">Admin</option>
                <option value="RESIDENT">Cư dân</option>
              </Select>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <Input 
                label="Email" 
                type="email"
                placeholder="name@email.com"
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
              />
              <Input 
                label="Số điện thoại" 
                placeholder="09xxxxxxxx"
                value={formData.phone}
                onChange={(e) => setFormData({...formData, phone: e.target.value})}
              />
            </div>
            <Input 
              label="Tên đăng nhập" 
              placeholder="Nhập tên đăng nhập"
              value={formData.username}
              onChange={(e) => setFormData({...formData, username: e.target.value})}
            />
            <Input 
              label="Mật khẩu" 
              type="password" 
              placeholder="••••••••"
              value={formData.password}
              onChange={(e) => setFormData({...formData, password: e.target.value})}
            />
            {error && <div className="rounded-xl bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 ring-1 ring-rose-200">{error}</div>}
            <div className="flex justify-end gap-3">
              <Button variant="secondary" onClick={handleCancel}>Huỷ</Button>
              <Button onClick={handleCreate}>Tạo tài khoản</Button>
            </div>
          </div>
        </Card>
      )}
      
      <div className="relative max-w-md flex-1 mb-5">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input placeholder="Tìm username, họ tên, email..." className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm outline-none focus:border-sky-400 focus:ring-4 focus:ring-sky-100" />
      </div>
      
      <DataTable columns={[
        { key: "username", label: "Username" },
        { key: "fullName", label: "Họ tên" },
        { key: "email", label: "Email" },
        { key: "phone", label: "SĐT", render: (r) => r.phone || "__" },
        { key: "apartment", label: "Căn hộ", render: (r) => r.apartment || "__" },
        { key: "role", label: "Vai trò", render: (r) => <Badge tone={r.role === "ADMIN" ? "blue" : "green"}>{r.role}</Badge> },
        { key: "active", label: "Trạng thái", render: (r) => <Badge tone={r.active === "Chờ duyệt" ? "yellow" : "green"}>{r.active}</Badge> },
      ]} rows={accountRows} />
    </>
  );
}

function Apartments() {
  const [filteredApartments, setFilteredApartments] = useState(apartments);
  const [filters, setFilters] = useState({
    code: "",
    floor: "Tất cả tầng",
    status: "Tất cả",
    owner: "",
  });

  const handleSearch = () => {
    let results = apartments;

    // Filter by apartment code
    if (filters.code.trim()) {
      results = results.filter(a => a.code.includes(filters.code.trim()));
    }

    // Filter by floor
    if (filters.floor !== "Tất cả tầng") {
      const floorNum = parseInt(filters.floor.replace("Tầng ", ""));
      results = results.filter(a => a.floor === floorNum);
    }

    // Filter by status
    if (filters.status !== "Tất cả") {
      const statusMap = {
        "Đang ở": "OCCUPIED",
        "Đang trống": "AVAILABLE",
      };
      const statusValue = statusMap[filters.status];
      results = results.filter(a => a.status === statusValue);
    }

    // Filter by owner name
    if (filters.owner.trim()) {
      results = results.filter(a => a.owner.toLowerCase().includes(filters.owner.toLowerCase()));
    }

    setFilteredApartments(results);
  };

  const handleReset = () => {
    setFilters({
      code: "",
      floor: "Tất cả tầng",
      status: "Tất cả",
      owner: "",
    });
    setFilteredApartments(apartments);
  };

  return (
    <>
      <SectionHeader title="Quản lý căn hộ" desc="Danh sách căn hộ cố định, có lọc theo số căn, tầng, trạng thái và chủ hộ." />
      <div className="mb-5 grid gap-3 md:grid-cols-4">
        <Input 
          label="Số căn hộ" 
          placeholder="VD: 1201" 
          value={filters.code}
          onChange={(e) => setFilters({...filters, code: e.target.value})}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
        />
        <Select 
          label="Tầng" 
          value={filters.floor}
          onChange={(e) => setFilters({...filters, floor: e.target.value})}
        >
          <option>Tất cả tầng</option>
          <option>Tầng 12</option>
          <option>Tầng 18</option>
          <option>Tầng 24</option>
        </Select>
        <Select 
          label="Trạng thái" 
          value={filters.status}
          onChange={(e) => setFilters({...filters, status: e.target.value})}
        >
          <option>Tất cả</option>
          <option>Đang ở</option>
          <option>Đang trống</option>
        </Select>
        <Input 
          label="Tên chủ hộ" 
          placeholder="Nhập tên chủ hộ"
          value={filters.owner}
          onChange={(e) => setFilters({...filters, owner: e.target.value})}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
        />
      </div>
      <div className="mb-5 flex gap-3">
        <Button onClick={handleSearch}><Search className="h-4 w-4" /> Tìm kiếm</Button>
        <Button variant="secondary" onClick={handleReset}>Xoá bộ lọc</Button>
      </div>
      <DataTable columns={[
        { key: "code", label: "Số căn" },
        { key: "floor", label: "Tầng" },
        { key: "area", label: "Diện tích", render: (r) => `${r.area} m²` },
        { key: "owner", label: "Chủ hộ" },
        { key: "members", label: "Nhân khẩu" },
        { key: "status", label: "Trạng thái", render: (r) => <StatusBadge status={r.status} /> },
      ]} rows={filteredApartments} />
    </>
  );
}

function Residents() {
  const [residentsList, setResidentsList] = useState(residents);
  const [filteredResidents, setFilteredResidents] = useState(residents);
  const [showForm, setShowForm] = useState(false);
  const [editingIndex, setEditingIndex] = useState(null);
  const [error, setError] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [searchFilters, setSearchFilters] = useState({
    name: "",
    room: "",
    idCard: "",
  });
  const [formData, setFormData] = useState({
    name: "",
    room: "",
    birthYear: "",
    idCard: "",
    relation: "",
    status: "PERMANENT",
  });

  const handleSearch = () => {
    let results = residentsList;

    // Filter by name
    if (searchFilters.name.trim()) {
      results = results.filter(r => r.name.toLowerCase().includes(searchFilters.name.toLowerCase()));
    }

    // Filter by room
    if (searchFilters.room.trim()) {
      results = results.filter(r => r.room.includes(searchFilters.room.trim()));
    }

    // Filter by ID card
    if (searchFilters.idCard.trim()) {
      results = results.filter(r => r.idCard.includes(searchFilters.idCard.trim()));
    }

    setFilteredResidents(results);
  };

  const handleResetSearch = () => {
    setSearchFilters({ name: "", room: "", idCard: "" });
    setFilteredResidents(residentsList);
  };

  const handleAdd = () => {
    // Validate form
    if (!formData.name.trim() || !formData.room.trim() || !formData.birthYear.trim() || !formData.relation.trim()) {
      setError("Vui lòng nhập đầy đủ thông tin");
      return;
    }

    if (editingIndex !== null) {
      // Update existing resident
      const updatedList = [...residentsList];
      updatedList[editingIndex] = {
        name: formData.name,
        room: formData.room,
        birthYear: formData.birthYear,
        idCard: formData.idCard || "",
        relation: formData.relation,
        status: formData.status,
      };
      setResidentsList(updatedList);
      setFilteredResidents(updatedList);
    } else {
      // Create new resident
      const newResident = {
        name: formData.name,
        room: formData.room,
        birthYear: formData.birthYear,
        idCard: formData.idCard || "",
        relation: formData.relation,
        status: formData.status,
      };

      const updatedList = [...residentsList, newResident];
      setResidentsList(updatedList);
      setFilteredResidents(updatedList);
    }
    
    // Reset form
    setFormData({
      name: "",
      room: "",
      birthYear: "",
      idCard: "",
      relation: "",
      status: "PERMANENT",
    });
    setError("");
    setEditingIndex(null);
    setShowForm(false);
  };

  const handleEdit = (index, resident) => {
    setFormData({
      name: resident.name,
      room: resident.room,
      birthYear: resident.birthYear,
      idCard: resident.idCard,
      relation: resident.relation,
      status: resident.status,
    });
    setEditingIndex(index);
    setShowForm(true);
    setError("");
  };

  const handleDeleteClick = () => {
    if (editingIndex !== null) {
      const resident = residentsList[editingIndex];
      setDeleteConfirm({ index: editingIndex, name: resident.name, room: resident.room });
    }
  };

  const handleConfirmDelete = () => {
    if (deleteConfirm) {
      const updatedList = residentsList.filter((_, i) => i !== deleteConfirm.index);
      setResidentsList(updatedList);
      setFilteredResidents(updatedList.filter(r => {
        if (searchFilters.name.trim() && !r.name.toLowerCase().includes(searchFilters.name.toLowerCase())) return false;
        if (searchFilters.room.trim() && !r.room.includes(searchFilters.room.trim())) return false;
        if (searchFilters.idCard.trim() && !r.idCard.includes(searchFilters.idCard.trim())) return false;
        return true;
      }));
      setDeleteConfirm(null);
      setShowForm(false);
      setEditingIndex(null);
    }
  };

  const handleCancel = () => {
    setFormData({
      name: "",
      room: "",
      birthYear: "",
      idCard: "",
      relation: "",
      status: "PERMANENT",
    });
    setError("");
    setShowForm(false);
    setEditingIndex(null);
  };

  return (
    <>
      <SectionHeader title="Quản lý nhân khẩu" desc="Thêm/sửa nhân khẩu, đăng ký thường trú hoặc tạm trú." action={<Button onClick={() => { setShowForm(true); setEditingIndex(null); setFormData({ name: "", room: "", birthYear: "", idCard: "", relation: "", status: "PERMANENT" }); }}><Plus className="h-4 w-4" /> Thêm nhân khẩu</Button>} />
      
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="rounded-3xl bg-white p-6 shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <h3 className="mb-4 text-lg font-bold">{editingIndex !== null ? "Chỉnh sửa nhân khẩu" : "Thêm nhân khẩu mới"}</h3>
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-1">
                <Input 
                  label="Họ tên" 
                  placeholder="Nguyễn Văn A"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                />
                <Input 
                  label="Căn hộ" 
                  placeholder="1201"
                  value={formData.room}
                  onChange={(e) => setFormData({...formData, room: e.target.value})}
                />
              </div>
              <div className="grid gap-4 md:grid-cols-1">
                <Input 
                  label="Năm sinh" 
                  placeholder="1990"
                  value={formData.birthYear}
                  onChange={(e) => setFormData({...formData, birthYear: e.target.value})}
                />
                <Input 
                  label="CCCD/CMND" 
                  placeholder="Có thể bỏ trống"
                  value={formData.idCard}
                  onChange={(e) => setFormData({...formData, idCard: e.target.value})}
                />
              </div>
              <div className="grid gap-4 md:grid-cols-1">
                <Input 
                  label="Quan hệ với chủ hộ" 
                  placeholder="Chủ hộ, Vợ, Con, v.v."
                  value={formData.relation}
                  onChange={(e) => setFormData({...formData, relation: e.target.value})}
                />
                <Select 
                  label="Cư trú" 
                  value={formData.status} 
                  onChange={(e) => setFormData({...formData, status: e.target.value})}
                >
                  <option value="PERMANENT">Thường trú</option>
                  <option value="TEMPORARY">Tạm trú</option>
                </Select>
              </div>
              {error && <div className="rounded-xl bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 ring-1 ring-rose-200">{error}</div>}
              <div className="flex justify-between gap-3 pt-4">
                <div className="flex gap-3">
                  <Button variant="secondary" onClick={handleCancel}>Hủy</Button>
                  {editingIndex !== null && (
                    <Button variant="danger" onClick={handleDeleteClick}>Xóa cư dân</Button>
                  )}
                </div>
                <Button onClick={handleAdd}>{editingIndex !== null ? "Lưu" : "Thêm nhân khẩu"}</Button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="rounded-3xl bg-white p-6 shadow-xl max-w-sm w-full">
            <div className="flex items-center gap-3 mb-4">
              <div className="rounded-full bg-rose-100 p-3">
                <AlertCircle className="h-6 w-6 text-rose-600" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">Xóa nhân khẩu</h3>
            </div>
            <p className="text-slate-600 mb-6">
              Bạn có chắc muốn xóa nhân khẩu <strong>{deleteConfirm.name}</strong> (Căn {deleteConfirm.room})? Hành động này không thể hoàn tác.
            </p>
            <div className="flex gap-3 justify-end">
              <Button variant="secondary" onClick={() => setDeleteConfirm(null)}>Hủy</Button>
              <Button variant="danger" onClick={handleConfirmDelete}>Xóa nhân khẩu</Button>
            </div>
          </motion.div>
        </div>
      )}
      
      <div className="mb-5 grid gap-3 md:grid-cols-3">
        <Input 
          label="Tìm theo họ tên" 
          placeholder="Nhập họ tên"
          value={searchFilters.name}
          onChange={(e) => setSearchFilters({...searchFilters, name: e.target.value})}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
        />
        <Input 
          label="Tìm theo căn hộ" 
          placeholder="Nhập số căn"
          value={searchFilters.room}
          onChange={(e) => setSearchFilters({...searchFilters, room: e.target.value})}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
        />
        <Input 
          label="Tìm theo CCCD/CMND" 
          placeholder="Nhập CCCD/CMND"
          value={searchFilters.idCard}
          onChange={(e) => setSearchFilters({...searchFilters, idCard: e.target.value})}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
        />
      </div>
      <div className="mb-5 flex gap-3">
        <Button onClick={handleSearch}><Search className="h-4 w-4" /> Tìm kiếm</Button>
        <Button variant="secondary" onClick={handleResetSearch}>Xoá bộ lọc</Button>
      </div>
      
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-5 py-4">Căn hộ</th>
                <th className="px-5 py-4">Họ tên</th>
                <th className="px-5 py-4">Năm sinh</th>
                <th className="px-5 py-4">CCCD/CMND</th>
                <th className="px-5 py-4">Quan hệ</th>
                <th className="px-5 py-4">Cư trú</th>
                <th className="px-5 py-4 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredResidents.map((r, idx) => {
                const originalIdx = residentsList.findIndex(resident => 
                  resident.name === r.name && resident.room === r.room && resident.birthYear === r.birthYear
                );
                return (
                  <tr key={idx} className="hover:bg-slate-50/80">
                    <td className="whitespace-nowrap px-5 py-4 text-slate-700">{r.room}</td>
                    <td className="whitespace-nowrap px-5 py-4 text-slate-700">{r.name}</td>
                    <td className="whitespace-nowrap px-5 py-4 text-slate-700">{r.birthYear}</td>
                    <td className="whitespace-nowrap px-5 py-4 text-slate-700">{r.idCard}</td>
                    <td className="whitespace-nowrap px-5 py-4 text-slate-700">{r.relation}</td>
                    <td className="whitespace-nowrap px-5 py-4 text-slate-700"><StatusBadge status={r.status} /></td>
                    <td className="px-5 py-4 text-right">
                      <button onClick={() => handleEdit(originalIdx, r)} className="font-semibold text-sky-700 hover:text-sky-900">Chi tiết</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

function Fees({ feesList, setFeesList, syncPaymentsForMandatoryFee, removePaymentsForFee }) {
  const emptyForm = {
    name: "",
    type: "MANDATORY",
    chargeMethod: "PER_M2",
    unitPrice: "",
    description: "",
    status: "ACTIVE",
  };

  const [filteredFees, setFilteredFees] = useState(feesList);
  const [showForm, setShowForm] = useState(false);
  const [editingIndex, setEditingIndex] = useState(null);
  const [formData, setFormData] = useState(emptyForm);
  const [error, setError] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [historyTarget, setHistoryTarget] = useState(null);
  const [filters, setFilters] = useState({ name: "", type: "ALL", chargeMethod: "ALL", status: "ALL" });

  const getTypeLabel = (type) => type === "MANDATORY" ? "Bắt buộc" : "Tự nguyện";
  const getTypeTone = (type) => type === "MANDATORY" ? "red" : "violet";
  const getStatusLabel = (status) => status === "ACTIVE" ? "Đang dùng" : "Ngừng dùng";
  const getStatusTone = (status) => status === "ACTIVE" ? "green" : "gray";
  const getMethodLabel = (method) => {
    const map = {
      PER_M2: "Theo m²",
      FIXED: "Cố định / hộ",
      DONATION: "Tự nguyện",
      NONE: "Không tính tự động",
    };
    return map[method] || method;
  };
  const getUnitLabel = (method) => {
    const map = {
      PER_M2: "đ/m²",
      FIXED: "đ/hộ",
      DONATION: "Theo số tiền nộp",
      NONE: "__",
    };
    return map[method] || "__";
  };
  const getFormulaText = (fee) => {
    if (fee.type === "DONATION" || fee.chargeMethod === "DONATION") return "Cư dân nộp bao nhiêu thì ghi nhận bấy nhiêu";
    if (fee.chargeMethod === "PER_M2") return "Diện tích căn hộ × đơn giá";
    if (fee.chargeMethod === "FIXED") return "Mỗi hộ nộp một số tiền cố định";
    return "Nhập thủ công khi thu phí";
  };
  const formatUnitPrice = (fee) => {
    if (!fee.unitPrice || fee.type === "DONATION" || fee.chargeMethod === "DONATION") return "__";
    return `${new Intl.NumberFormat("vi-VN").format(Number(fee.unitPrice))} ${getUnitLabel(fee.chargeMethod)}`;
  };
  const getFeeChangeLog = (from, to) => {
    const changes = [];
    if (from.name !== to.name) changes.push(`Tên: "${from.name}" → "${to.name}"`);
    if (from.type !== to.type) changes.push(`Loại: ${getTypeLabel(from.type)} → ${getTypeLabel(to.type)}`);
    if (from.chargeMethod !== to.chargeMethod) changes.push(`Cách tính: ${getMethodLabel(from.chargeMethod)} → ${getMethodLabel(to.chargeMethod)}`);
    if (Number(from.unitPrice || 0) !== Number(to.unitPrice || 0)) changes.push(`Đơn giá: ${formatUnitPrice(from)} → ${formatUnitPrice(to)}`);
    if (from.status !== to.status) changes.push(`Trạng thái: ${getStatusLabel(from.status)} → ${getStatusLabel(to.status)}`);
    if ((from.description || "") !== (to.description || "")) changes.push("Mô tả đã được cập nhật");
    return changes;
  };

  const applyFilters = (source = feesList) => {
    let results = source;

    if (filters.name.trim()) {
      const keyword = filters.name.trim().toLowerCase();
      results = results.filter((fee) => fee.name.toLowerCase().includes(keyword));
    }

    if (filters.type !== "ALL") {
      results = results.filter((fee) => fee.type === filters.type);
    }

    if (filters.chargeMethod !== "ALL") {
      results = results.filter((fee) => fee.chargeMethod === filters.chargeMethod);
    }

    if (filters.status !== "ALL") {
      results = results.filter((fee) => fee.status === filters.status);
    }

    setFilteredFees(results);
  };

  const handleResetFilters = () => {
    setFilters({ name: "", type: "ALL", chargeMethod: "ALL", status: "ALL" });
    setFilteredFees(feesList);
  };

  const openCreateForm = () => {
    setFormData(emptyForm);
    setEditingIndex(null);
    setError("");
    setShowForm(true);
  };

  const openDetail = (fee) => {
    const index = feesList.findIndex((item) => item.id === fee.id);
    setEditingIndex(index);
    setFormData({
      name: fee.name,
      type: fee.type,
      chargeMethod: fee.chargeMethod,
      unitPrice: fee.unitPrice ? String(fee.unitPrice) : "",
      description: fee.description || "",
      status: fee.status,
    });
    setError("");
    setShowForm(true);
  };

  const handleSave = () => {
    const name = formData.name.trim();
    const description = formData.description.trim();
    const unitPrice = Number(formData.unitPrice || 0);

    if (!name) {
      setError("Vui lòng nhập tên khoản thu");
      return;
    }

    const duplicated = feesList.some((fee, index) =>
      index !== editingIndex && fee.name.trim().toLowerCase() === name.toLowerCase()
    );
    if (duplicated) {
      setError("Tên khoản thu đã tồn tại");
      return;
    }

    if (formData.type === "MANDATORY" && formData.chargeMethod !== "NONE" && unitPrice <= 0) {
      setError("Khoản thu bắt buộc phải có đơn giá lớn hơn 0");
      return;
    }

    const oldFee = editingIndex !== null ? feesList[editingIndex] : null;
    const history = oldFee?.history ? [...oldFee.history] : [];
    const normalizedFee = {
      id: editingIndex !== null ? feesList[editingIndex].id : `FEE-${Date.now()}`,
      name,
      type: formData.type,
      chargeMethod: formData.type === "DONATION" ? "DONATION" : formData.chargeMethod,
      unitPrice: formData.type === "DONATION" ? 0 : unitPrice,
      description,
      status: formData.status,
      history,
    };

    if (oldFee) {
      const changes = getFeeChangeLog(oldFee, normalizedFee);
      if (changes.length) {
        history.unshift({
          id: `H-${Date.now()}`,
          date: new Date().toLocaleString("vi-VN", { dateStyle: "short", timeStyle: "short" }),
          changes,
        });
      }
    }

    let updatedList;
    if (editingIndex !== null) {
      updatedList = feesList.map((fee, index) => index === editingIndex ? normalizedFee : fee);
    } else {
      updatedList = [...feesList, normalizedFee];
    }

    setFeesList(updatedList);
    setFilteredFees(updatedList);
    syncPaymentsForMandatoryFee?.(normalizedFee);
    setFormData(emptyForm);
    setEditingIndex(null);
    setError("");
    setShowForm(false);
  };

  const handleDelete = () => {
    if (deleteConfirm === null) return;
    const deletedFee = feesList[deleteConfirm.index];
    const updatedList = feesList.filter((_, index) => index !== deleteConfirm.index);
    setFeesList(updatedList);
    setFilteredFees(updatedList);
    removePaymentsForFee?.(deletedFee.id);
    setDeleteConfirm(null);
    setShowForm(false);
    setEditingIndex(null);
    setFormData(emptyForm);
    setError("");
  };

  const handleCancel = () => {
    setFormData(emptyForm);
    setEditingIndex(null);
    setError("");
    setShowForm(false);
  };

  const currentFee = editingIndex !== null ? feesList[editingIndex] : null;

  return (
    <>
      <SectionHeader
        title="Quản lý khoản thu"
        desc="Dữ liệu khoản thu được lưu trong database mô phỏng localStorage. Khoản thu bắt buộc sẽ tự sinh tiền cần nộp ở phần Thu phí."
        action={<Button onClick={openCreateForm}><Plus className="h-4 w-4" /> Tạo khoản thu</Button>}
      />

      <Card className="mb-5">
        <div className="grid gap-4 md:grid-cols-4">
          <Input
            label="Tìm theo tên khoản thu"
            placeholder="VD: phí quản lý"
            value={filters.name}
            onChange={(e) => setFilters({ ...filters, name: e.target.value })}
            onKeyDown={(e) => e.key === "Enter" && applyFilters()}
          />
          <Select label="Loại khoản thu" value={filters.type} onChange={(e) => setFilters({ ...filters, type: e.target.value })}>
            <option value="ALL">Tất cả</option>
            <option value="MANDATORY">Bắt buộc</option>
            <option value="DONATION">Tự nguyện</option>
          </Select>
          <Select label="Cách tính" value={filters.chargeMethod} onChange={(e) => setFilters({ ...filters, chargeMethod: e.target.value })}>
            <option value="ALL">Tất cả</option>
            <option value="PER_M2">Theo m²</option>
            <option value="FIXED">Cố định / hộ</option>
            <option value="DONATION">Tự nguyện</option>
            <option value="NONE">Không tính tự động</option>
          </Select>
          <Select label="Trạng thái" value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })}>
            <option value="ALL">Tất cả</option>
            <option value="ACTIVE">Đang dùng</option>
            <option value="ENDED">Ngừng dùng</option>
          </Select>
        </div>
        <div className="mt-4 flex gap-3">
          <Button onClick={() => applyFilters()}><Search className="h-4 w-4" /> Tìm kiếm</Button>
          <Button variant="secondary" onClick={handleResetFilters}>Xóa bộ lọc</Button>
        </div>
      </Card>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-5 py-4">Tên khoản thu</th>
                <th className="px-5 py-4">Loại</th>
                <th className="px-5 py-4">Cách tính</th>
                <th className="px-5 py-4">Đơn giá</th>
                <th className="px-5 py-4">Trạng thái</th>
                <th className="px-5 py-4 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredFees.map((fee) => (
                <tr key={fee.id} className="hover:bg-slate-50/80">
                  <td className="px-5 py-4 font-semibold text-slate-800">{fee.name}</td>
                  <td className="px-5 py-4"><Badge tone={getTypeTone(fee.type)}>{getTypeLabel(fee.type)}</Badge></td>
                  <td className="px-5 py-4 text-slate-700">{getMethodLabel(fee.chargeMethod)}</td>
                  <td className="px-5 py-4 text-slate-700">{formatUnitPrice(fee)}</td>
                  <td className="px-5 py-4"><Badge tone={getStatusTone(fee.status)}>{getStatusLabel(fee.status)}</Badge></td>
                  <td className="px-5 py-4 text-right">
                    <button onClick={() => openDetail(fee)} className="font-semibold text-sky-700 hover:text-sky-900">Chi tiết</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white p-6 shadow-xl">
            <h3 className="mb-4 text-lg font-black">{editingIndex !== null ? "Chi tiết khoản thu" : "Tạo khoản thu mới"}</h3>
            <div className="space-y-4">
              <Input label="Tên khoản thu" placeholder="VD: Phí quản lý chung cư" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
              <div className="grid gap-4 md:grid-cols-2">
                <Select label="Loại" value={formData.type} onChange={(e) => setFormData({ ...formData, type: e.target.value, chargeMethod: e.target.value === "DONATION" ? "DONATION" : "PER_M2", unitPrice: e.target.value === "DONATION" ? "" : formData.unitPrice })}>
                  <option value="MANDATORY">Bắt buộc</option>
                  <option value="DONATION">Tự nguyện</option>
                </Select>
                <Select label="Cách tính" value={formData.chargeMethod} onChange={(e) => setFormData({ ...formData, chargeMethod: e.target.value })}>
                  <option value="PER_M2">Theo m²</option>
                  <option value="FIXED">Cố định / hộ</option>
                  <option value="DONATION">Tự nguyện</option>
                  <option value="NONE">Không tính tự động</option>
                </Select>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <Input label={`Đơn giá (${getUnitLabel(formData.chargeMethod)})`} placeholder="VD: 7000" type="number" value={formData.unitPrice} disabled={formData.type === "DONATION" || formData.chargeMethod === "DONATION"} onChange={(e) => setFormData({ ...formData, unitPrice: e.target.value })} />
                <Select label="Trạng thái" value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value })}>
                  <option value="ACTIVE">Đang dùng</option>
                  <option value="ENDED">Ngừng dùng</option>
                </Select>
              </div>
              <label className="block">
                <span className="mb-1.5 block text-sm font-semibold text-slate-700">Mô tả</span>
                <textarea rows={4} value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-sky-400 focus:ring-4 focus:ring-sky-100" placeholder="Nhập mô tả khoản thu..." />
              </label>

              {error && <div className="rounded-xl bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 ring-1 ring-rose-200">{error}</div>}

              <div className="flex flex-col gap-3 pt-2 md:flex-row md:items-center md:justify-between">
                <div className="flex flex-wrap gap-3">
                  <Button variant="secondary" onClick={handleCancel}>Hủy</Button>
                  {editingIndex !== null && (
                    <>
                      <Button variant="secondary" onClick={() => setHistoryTarget(currentFee)}>Lịch sử chỉnh sửa</Button>
                      <Button variant="danger" onClick={() => setDeleteConfirm({ index: editingIndex, name: currentFee.name })}>Xóa</Button>
                    </>
                  )}
                </div>
                <Button onClick={handleSave}>Lưu</Button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {deleteConfirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
          <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-xl">
            <h3 className="mb-3 text-lg font-black">Xóa khoản thu</h3>
            <p className="mb-5 text-sm text-slate-600">Bạn có chắc muốn xóa <strong>{deleteConfirm.name}</strong>? Các bản ghi thu phí liên quan cũng sẽ được xóa khỏi database mô phỏng.</p>
            <div className="flex justify-end gap-3">
              <Button variant="secondary" onClick={() => setDeleteConfirm(null)}>Hủy</Button>
              <Button variant="danger" onClick={handleDelete}>Xóa</Button>
            </div>
          </motion.div>
        </div>
      )}

      {historyTarget && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4">
          <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl bg-white p-6 shadow-xl">
            <h3 className="mb-4 text-lg font-black">Lịch sử chỉnh sửa</h3>
            {historyTarget.history?.length ? (
              <div className="space-y-3">
                {historyTarget.history.map((item) => (
                  <div key={item.id} className="rounded-2xl border border-slate-200 p-4">
                    <p className="font-bold text-slate-900">{item.date}</p>
                    <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-600">
                      {item.changes.map((change, index) => <li key={index}>{change}</li>)}
                    </ul>
                  </div>
                ))}
              </div>
            ) : (
              <p className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">Chưa có lịch sử chỉnh sửa.</p>
            )}
            <div className="mt-5 flex justify-end">
              <Button variant="secondary" onClick={() => setHistoryTarget(null)}>Đóng</Button>
            </div>
          </motion.div>
        </div>
      )}
    </>
  );
}

function Payments({ feesList, paymentRecords, setPaymentRecords }) {
  const mandatoryFees = feesList.filter((fee) => fee.type === "MANDATORY" && fee.status === "ACTIVE");
  const months = Array.from({ length: 12 }, (_, index) => index + 1);
  const years = [2025, 2026, 2027, 2028];
  const [showBatchForm, setShowBatchForm] = useState(false);
  const [showOnlyUnpaid, setShowOnlyUnpaid] = useState(false);
  const [selectedBill, setSelectedBill] = useState(null);
  const [paymentForm, setPaymentForm] = useState({ amountPaid: "", paidDate: "", note: "" });
  const [historyTarget, setHistoryTarget] = useState(null);
  const [error, setError] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [confirmBatchData, setConfirmBatchData] = useState(null);
  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();
  const [filters, setFilters] = useState({ room: "", status: "ALL", month: String(currentMonth), year: String(currentYear) });
  const [batchType, setBatchType] = useState("mandatory");
  const [batchData, setBatchData] = useState({
    feeId: mandatoryFees[0]?.id || "",
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
  });

  // Đọc các dữ liệu đã thêm ở các màn hình khác từ database mô phỏng.
  const [vehiclesList] = useDatabaseState("bluemoon_vehicles", initialVehicles);
  const [utilitiesList] = useDatabaseState("bluemoon_utilities", initialUtilities);
  const [unitPrices] = useDatabaseState("bluemoon_utility_prices", {
    ELECTRICITY: 3500,
    WATER: 7000,
    INTERNET: 220000,
  });
  const [householdPaymentStatus, setHouseholdPaymentStatus] = useDatabaseState("bluemoon_household_payment_status", {});

  const getFee = (feeId) => feesList.find((fee) => fee.id === feeId);
  const getPaymentStatusLabel = (status) => status === "PAID" ? "Đã nộp" : "Chưa nộp";
  const getPaymentStatusTone = (status) => status === "PAID" ? "green" : "red";
  const makeBillKey = (room) => String(room);
  const makePeriodKey = (month, year) => `${month}/${year}`;
  const parseNumber = (value) => {
    if (value === "__") return 0;
    const number = Number(value);
    return Number.isNaN(number) ? 0 : number;
  };

  const getUtilityLabel = (type) => {
    if (type === "ELECTRICITY") return "Điện";
    if (type === "WATER") return "Nước";
    if (type === "INTERNET") return "Internet";
    return type;
  };

  const getUtilityUnitLabel = (type) => {
    if (type === "ELECTRICITY") return "đ/số";
    if (type === "WATER") return "đ/m³";
    return "đ/tháng";
  };

  const calculateUtilityAmount = (utility) => {
    if (utility.type === "INTERNET") return parseNumber(unitPrices.INTERNET);
    return Math.max(0, parseNumber(utility.newIndex) - parseNumber(utility.oldIndex)) * parseNumber(unitPrices[utility.type]);
  };

  const matchesSelectedPeriod = (month, year) => {
    if (filters.month !== "ALL" && Number(month) !== Number(filters.month)) return false;
    if (filters.year !== "ALL" && Number(year) !== Number(filters.year)) return false;
    return true;
  };

  const buildBillItemsForPeriod = (room, month, year) => {
    const period = makePeriodKey(month, year);

    const feeItems = paymentRecords
      .filter((record) => record.room === room && Number(record.month) === Number(month) && Number(record.year) === Number(year))
      .map((record) => ({
        id: record.id,
        period,
        group: record.feeName?.toLowerCase().includes("phòng") ? "Tiền phòng" : "Khoản thu bắt buộc",
        name: record.feeName,
        formula: record.chargeMethod === "PER_M2"
          ? `${record.area || 0} m² × ${new Intl.NumberFormat("vi-VN").format(record.unitPrice || 0)} đ/m²`
          : `Cố định ${money(record.unitPrice || record.amountDue || 0)}`,
        amountDue: Number(record.amountDue || 0),
      }));

    const currentMonth = new Date().getMonth() + 1;
    const currentYear = new Date().getFullYear();
    const vehicleItems = Number(month) === Number(currentMonth) && Number(year) === Number(currentYear)
      ? vehiclesList
          .filter((vehicle) => vehicle.room === room)
          .map((vehicle) => ({
            id: `VEHICLE-${vehicle.plate}-${vehicle.slot}-${room}-${month}-${year}`,
            period,
            group: "Gửi xe",
            name: `${vehicle.type}${vehicle.plate && vehicle.plate !== "__" ? ` - ${vehicle.plate}` : ""} (${vehicle.slot})`,
            formula: `${new Intl.NumberFormat("vi-VN").format(Number(vehicle.fee || 0))} đ/tháng`,
            amountDue: Number(vehicle.fee || 0),
          }))
      : [];

    const utilityItems = utilitiesList
      .filter((utility) => utility.room === room && Number(utility.month) === Number(month) && Number(utility.year) === Number(year))
      .map((utility) => {
        const amountDue = calculateUtilityAmount(utility);
        const formula = utility.type === "INTERNET"
          ? `${new Intl.NumberFormat("vi-VN").format(unitPrices.INTERNET || 0)} đ/tháng`
          : `(${utility.newIndex} - ${utility.oldIndex}) × ${new Intl.NumberFormat("vi-VN").format(unitPrices[utility.type] || 0)} ${getUtilityUnitLabel(utility.type)}`;

        return {
          id: `UTILITY-${utility.id}`,
          period,
          group: "Điện/Nước/Internet",
          name: getUtilityLabel(utility.type),
          formula,
          amountDue,
        };
      });

    return [...feeItems, ...vehicleItems, ...utilityItems];
  };

  const getPeriodsForRoom = (room) => {
    const periods = new Set();
    const currentMonth = new Date().getMonth() + 1;
    const currentYear = new Date().getFullYear();

    paymentRecords
      .filter((record) => record.room === room)
      .forEach((record) => periods.add(`${record.month}|${record.year}`));

    utilitiesList
      .filter((utility) => utility.room === room)
      .forEach((utility) => periods.add(`${utility.month}|${utility.year}`));

    if (vehiclesList.some((vehicle) => vehicle.room === room)) {
      periods.add(`${currentMonth}|${currentYear}`);
    }

    return Array.from(periods)
      .map((periodKey) => {
        const [month, year] = periodKey.split("|");
        return { month: Number(month), year: Number(year) };
      })
      .filter(({ month, year }) => matchesSelectedPeriod(month, year))
      .sort((a, b) => Number(a.year) - Number(b.year) || Number(a.month) - Number(b.month));
  };

  const householdRows = useMemo(() => {
    const rooms = new Set();
    paymentRecords.forEach((record) => rooms.add(record.room));
    utilitiesList.forEach((utility) => rooms.add(utility.room));
    vehiclesList.forEach((vehicle) => rooms.add(vehicle.room));

    return Array.from(rooms)
      .map((room) => {
        const household = getHouseholds().find((item) => item.room === room);
        const fallbackRecord = paymentRecords.find((record) => record.room === room);
        const periods = getPeriodsForRoom(room);
        const items = periods.flatMap(({ month, year }) => buildBillItemsForPeriod(room, month, year));
        const totalAmountDue = items.reduce((sum, item) => sum + Number(item.amountDue || 0), 0);
        const rowKey = makeBillKey(room);
        const savedPayment = householdPaymentStatus[rowKey];
        
        // Tính dư từ các tháng trước tháng được chọn
        const selectedMonth = Number(filters.month);
        const selectedYear = Number(filters.year);
        const previousRecords = paymentRecords.filter((record) => 
          record.room === room && 
          (Number(record.year) < selectedYear || 
           (Number(record.year) === selectedYear && Number(record.month) < selectedMonth))
        );
        const previousDue = previousRecords.reduce((sum, record) => sum + Number(record.amountDue || 0), 0);
        const previousPaid = previousRecords.reduce((sum, record) => sum + Number(record.amountPaid || 0), 0);
        const surplusFromPrevious = Math.max(0, previousPaid - previousDue);
        
        // Cần đóng = Tổng - Dư từ trước (không được âm)
        const amountDue = Math.max(0, totalAmountDue - surplusFromPrevious);
        
        const legacyPaid = paymentRecords
          .filter((record) => record.room === room && matchesSelectedPeriod(record.month, record.year))
          .reduce((sum, record) => sum + Number(record.amountPaid || 0), 0);
        const amountPaid = savedPayment ? Number(savedPayment.amountPaid || 0) : legacyPaid;

        return {
          id: rowKey,
          key: rowKey,
          room,
          owner: household?.owner || fallbackRecord?.owner || "__",
          periods,
          amountDue,
          amountPaid,
          paidDate: savedPayment?.paidDate || "",
          note: savedPayment?.note || "",
          history: savedPayment?.history || [],
          status: calculatePaymentStatus(amountDue, amountPaid),
          items,
        };
      })
      .filter((bill) => bill.amountDue > 0)
      .filter((bill) => !filters.room.trim() || bill.room.includes(filters.room.trim()))
      .filter((bill) => filters.status === "ALL" || bill.status === filters.status)
      .filter((bill) => !showOnlyUnpaid || bill.status === "UNPAID")
      .sort((a, b) => String(a.room).localeCompare(String(b.room)));
  }, [paymentRecords, vehiclesList, utilitiesList, unitPrices, householdPaymentStatus, filters, showOnlyUnpaid]);

  const resetFilters = () => {
    setFilters({ room: "", status: "ALL", month: String(currentMonth), year: String(currentYear) });
    setShowOnlyUnpaid(false);
  };

  const handleCreateBatch = () => {
    if (batchType === "mandatory" || batchType === "all") {
      const fee = getFee(batchData.feeId);
      if (!fee) {
        setError("Vui lòng chọn khoản thu bắt buộc");
        return;
      }
      setConfirmBatchData({ type: batchType, fee, month: batchData.month, year: batchData.year });
    } else if (batchType === "utilities") {
      setConfirmBatchData({ type: "utilities", month: batchData.month, year: batchData.year });
    } else if (batchType === "vehicles") {
      setConfirmBatchData({ type: "vehicles", month: batchData.month, year: batchData.year });
    }
  };

  const handleConfirmBatch = () => {
    if (!confirmBatchData) return;

    if (confirmBatchData.type === "mandatory") {
      const newRecords = buildPaymentRecordsForFee(confirmBatchData.fee, Number(confirmBatchData.month), Number(confirmBatchData.year), paymentRecords);
      if (newRecords.length === 0) {
        setError("Đợt thu này đã được lập cho tất cả hộ đang ở");
        setConfirmBatchData(null);
        return;
      }
      setPaymentRecords((prev) => [...prev, ...newRecords]);
    } else if (confirmBatchData.type === "all") {
      const newRecords = buildPaymentRecordsForFee(confirmBatchData.fee, Number(confirmBatchData.month), Number(confirmBatchData.year), paymentRecords);
      if (newRecords.length === 0) {
        setError("Đợt thu này đã được lập cho tất cả hộ đang ở");
        setConfirmBatchData(null);
        return;
      }
      setPaymentRecords((prev) => [...prev, ...newRecords]);
    } else if (confirmBatchData.type === "utilities") {
      // Utilities data is already in the system
    } else if (confirmBatchData.type === "vehicles") {
      // Vehicles data is already in the system
    }

    setError("");
    setShowBatchForm(false);
    setConfirmBatchData(null);
  };

  const openPaymentDetail = (bill) => {
    setSelectedBill(bill);
    
    // Kiểm tra nếu có dư từ tháng trước, thì auto-fill amountPaid = amountDue
    const selectedMonth = Number(filters.month);
    const selectedYear = Number(filters.year);
    const previousRecords = paymentRecords.filter((record) => 
      record.room === bill.room && 
      (Number(record.year) < selectedYear || 
       (Number(record.year) === selectedYear && Number(record.month) < selectedMonth))
    );
    const previousDue = previousRecords.reduce((sum, record) => sum + Number(record.amountDue || 0), 0);
    const previousPaid = previousRecords.reduce((sum, record) => sum + Number(record.amountPaid || 0), 0);
    const surplusFromPrevious = Math.max(0, previousPaid - previousDue);
    
    // Nếu có dư >= 0, tự động fill "Đã nộp" = "Cần nộp"
    const autoPaid = surplusFromPrevious > 0 ? bill.amountDue : bill.amountPaid;
    
    setPaymentForm({
      amountPaid: String(autoPaid || ""),
      paidDate: bill.paidDate || new Date().toISOString().slice(0, 10),
      note: bill.note || "",
    });
    setError("");
  };

  const getPaymentChangeLog = (from, to) => {
    const changes = [];
    if (Number(from.amountPaid || 0) !== Number(to.amountPaid || 0)) changes.push(`Đã nộp: ${money(from.amountPaid || 0)} → ${money(to.amountPaid || 0)}`);
    if ((from.paidDate || "") !== (to.paidDate || "")) changes.push(`Ngày nộp: ${from.paidDate || "__"} → ${to.paidDate || "__"}`);
    if ((from.note || "") !== (to.note || "")) changes.push("Ghi chú đã được cập nhật");
    if (from.status !== to.status) changes.push(`Trạng thái: ${getPaymentStatusLabel(from.status)} → ${getPaymentStatusLabel(to.status)}`);
    return changes;
  };

  const handleSavePayment = () => {
    if (!selectedBill) return;

    const amountPaid = Number(paymentForm.amountPaid || 0);
    if (amountPaid < 0) {
      setError("Số tiền đã nộp không được nhỏ hơn 0");
      return;
    }

    const status = calculatePaymentStatus(selectedBill.amountDue, amountPaid);
    const updatedBill = {
      ...selectedBill,
      amountPaid,
      paidDate: amountPaid > 0 ? paymentForm.paidDate : "",
      note: paymentForm.note.trim(),
      status,
      history: selectedBill.history ? [...selectedBill.history] : [],
    };

    const changes = getPaymentChangeLog(selectedBill, updatedBill);
    if (changes.length) {
      updatedBill.history.unshift({
        id: `HP-${Date.now()}`,
        date: new Date().toLocaleString("vi-VN", { dateStyle: "short", timeStyle: "short" }),
        changes,
      });
    }

    setHouseholdPaymentStatus((prev) => ({
      ...prev,
      [selectedBill.key]: {
        amountPaid: updatedBill.amountPaid,
        paidDate: updatedBill.paidDate,
        note: updatedBill.note,
        history: updatedBill.history,
      },
    }));

    setSelectedBill(null);
    setPaymentForm({ amountPaid: "", paidDate: "", note: "" });
    setError("");
  };

  const handleDeletePayment = () => {
    if (!deleteConfirm) return;
    setHouseholdPaymentStatus((prev) => {
      const next = { ...prev };
      delete next[deleteConfirm.key];
      return next;
    });
    setDeleteConfirm(null);
    setSelectedBill(null);
  };

  const summary = householdRows.reduce(
    (acc, bill) => {
      acc.totalDue += Number(bill.amountDue || 0);
      acc.totalPaid += Number(bill.amountPaid || 0);
      if (bill.status === "UNPAID") acc.unpaid += 1;
      if (bill.status === "PAID") acc.paid += 1;
      return acc;
    },
    { totalDue: 0, totalPaid: 0, unpaid: 0, paid: 0 }
  );

  const getPeriodSummary = (bill) => {
    if (!bill.periods?.length) return "__";
    if (bill.periods.length === 1) return `Tháng ${bill.periods[0].month}/${bill.periods[0].year}`;
    const first = bill.periods[0];
    const last = bill.periods[bill.periods.length - 1];
    return `${bill.periods.length} kỳ (${first.month}/${first.year} - ${last.month}/${last.year})`;
  };

  return (
    <>
      <SectionHeader
        title="Lập đợt thu / Thu phí"
        desc="Bảng chính chỉ hiển thị một dòng cho mỗi căn hộ. Bấm Chi tiết để xem từng khoản như tiền phòng, phí quản lý, gửi xe, điện, nước, internet."
        action={<Button onClick={() => setShowBatchForm(true)}><Plus className="h-4 w-4" /> Lập đợt thu</Button>}
      />

      <div className="mb-5 grid gap-4 md:grid-cols-4">
        <Card><p className="text-sm font-semibold text-slate-500">Tổng phải thu</p><p className="mt-2 text-2xl font-black">{money(summary.totalDue)}</p></Card>
        <Card><p className="text-sm font-semibold text-slate-500">Đã thu</p><p className="mt-2 text-2xl font-black text-emerald-700">{money(summary.totalPaid)}</p></Card>
        <Card><p className="text-sm font-semibold text-slate-500">Hộ đã nộp</p><p className="mt-2 text-2xl font-black text-emerald-700">{summary.paid}</p></Card>
        <Card><p className="text-sm font-semibold text-slate-500">Hộ chưa nộp</p><p className="mt-2 text-2xl font-black text-rose-700">{summary.unpaid}</p></Card>
      </div>

      {showBatchForm && (
        <Card className="mb-5">
          <h3 className="mb-4 text-lg font-black">Lập đợt thu mới</h3>
          <div className="grid gap-4" style={{ gridTemplateColumns: batchType === "all" ? "1fr 1fr 1fr" : "1fr 1fr 1fr" }}>
            <Select label="Loại đợt thu" value={batchType} onChange={(e) => setBatchType(e.target.value)}>
              <option value="mandatory">Khoản bắt buộc</option>
              <option value="all">Tất cả khoản (bắt buộc + điện/nước/Internet/gửi xe)</option>
              <option value="utilities">Điện/Nước/Internet</option>
              <option value="vehicles">Gửi xe</option>
            </Select>
            {batchType !== "all" && (
              <>
                {batchType === "mandatory" && (
                  <Select label="Khoản thu bắt buộc" value={batchData.feeId} onChange={(e) => setBatchData({ ...batchData, feeId: e.target.value })}>
                    {mandatoryFees.map((fee) => <option key={fee.id} value={fee.id}>{fee.name}</option>)}
                  </Select>
                )}
              </>
            )}
            <Select label="Tháng" value={batchData.month} onChange={(e) => setBatchData({ ...batchData, month: e.target.value })}>
              {months.map((month) => <option key={month} value={month}>Tháng {month}</option>)}
            </Select>
            <Select label="Năm" value={batchData.year} onChange={(e) => setBatchData({ ...batchData, year: e.target.value })}>
              {years.map((year) => <option key={year} value={year}>{year}</option>)}
            </Select>
          </div>
          {error && <div className="mt-4 rounded-xl bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 ring-1 ring-rose-200">{error}</div>}
          <div className="mt-4 flex justify-end gap-3">
            <Button variant="secondary" onClick={() => { setShowBatchForm(false); setError(""); }}>Hủy</Button>
            <Button onClick={handleCreateBatch}>Tạo đợt thu</Button>
          </div>
        </Card>
      )}

      <Card className="mb-5">
        <div className="grid gap-4 md:grid-cols-4">
          <Input label="Căn hộ" placeholder="VD: 1201" value={filters.room} onChange={(e) => setFilters({ ...filters, room: e.target.value })} />
          <Select label="Tháng" value={filters.month} onChange={(e) => setFilters({ ...filters, month: e.target.value })}>
            {months.map((month) => <option key={month} value={month}>Tháng {month}</option>)}
          </Select>
          <Select label="Năm" value={filters.year} onChange={(e) => setFilters({ ...filters, year: e.target.value })}>
            {years.map((year) => <option key={year} value={year}>{year}</option>)}
          </Select>
          <Select label="Trạng thái" value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })}>
            <option value="ALL">Tất cả</option>
            <option value="PAID">Đã nộp</option>
            <option value="UNPAID">Chưa nộp</option>
          </Select>
        </div>
        <div className="mt-4 flex flex-wrap gap-3">
          <Button onClick={() => setShowOnlyUnpaid(false)}><Search className="h-4 w-4" /> Tìm kiếm</Button>
          <Button variant="secondary" onClick={() => setShowOnlyUnpaid(true)}>Danh sách hộ chưa nộp</Button>
          <Button variant="secondary" onClick={() => setFilters({ room: "", status: "ALL", month: String(currentMonth), year: String(currentYear) })}>Xóa bộ lọc</Button>
        </div>
      </Card>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-5 py-4">Căn hộ</th>
                <th className="px-5 py-4">Chủ hộ</th>
                <th className="px-5 py-4">Cần đóng</th>
                <th className="px-5 py-4">Đã nộp</th>
                <th className="px-5 py-4">Còn dư</th>
                <th className="px-5 py-4">Trạng thái</th>
                <th className="px-5 py-4 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {householdRows.map((bill) => {
                const surplus = Number(bill.amountPaid || 0) - Number(bill.amountDue || 0);
                return (
                  <tr key={bill.key} className="hover:bg-slate-50/80">
                    <td className="px-5 py-4 font-semibold text-slate-800">{bill.room}</td>
                    <td className="px-5 py-4 text-slate-700">{bill.owner}</td>
                    <td className="px-5 py-4 text-slate-700">{money(bill.amountDue)}</td>
                    <td className="px-5 py-4 text-slate-700">{money(bill.amountPaid || 0)}</td>
                    <td className={`px-5 py-4 font-semibold ${surplus > 0 ? 'text-emerald-700' : surplus < 0 ? 'text-rose-700' : 'text-slate-700'}`}>
                      {surplus > 0 ? `+${money(surplus)}` : surplus < 0 ? `−${money(Math.abs(surplus))}` : money(0)}
                    </td>
                    <td className="px-5 py-4"><Badge tone={getPaymentStatusTone(bill.status)}>{getPaymentStatusLabel(bill.status)}</Badge></td>
                    <td className="px-5 py-4 text-right">
                      <button onClick={() => openPaymentDetail(bill)} className="font-semibold text-sky-700 hover:text-sky-900">Chi tiết</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {selectedBill && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="max-h-[90vh] w-full max-w-5xl overflow-y-auto rounded-3xl bg-white p-6 shadow-xl">
            <h3 className="mb-4 text-lg font-black">Chi tiết thu phí căn {selectedBill.room}</h3>
            <div className="mb-4 grid gap-3 md:grid-cols-5">
              <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600"><strong>Chủ hộ:</strong><br />{selectedBill.owner}</div>
              <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600"><strong>Tháng hiện tại:</strong><br />Tháng {new Date().getMonth() + 1}/{new Date().getFullYear()}</div>
              <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600"><strong>Tổng cần đóng:</strong><br />{money(selectedBill.amountDue)}</div>
              <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600"><strong>Đã nộp:</strong><br />{money(Number(paymentForm.amountPaid || 0))}</div>
              <div className={`rounded-2xl p-4 text-sm font-semibold ${Number(paymentForm.amountPaid || 0) > selectedBill.amountDue ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-50 text-slate-600'}`}>
                <strong>Còn dư:</strong><br />
                {Number(paymentForm.amountPaid || 0) > selectedBill.amountDue 
                  ? `+${money(Number(paymentForm.amountPaid) - selectedBill.amountDue)}` 
                  : Number(paymentForm.amountPaid || 0) < selectedBill.amountDue ? `−${money(selectedBill.amountDue - Number(paymentForm.amountPaid || 0))}` : money(0)}
              </div>
            </div>

            <div className="mb-5 overflow-hidden rounded-2xl border border-slate-200">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Tháng</th>
                    <th className="px-4 py-3">Nhóm khoản</th>
                    <th className="px-4 py-3">Nội dung</th>
                    <th className="px-4 py-3">Cách tính</th>
                    <th className="px-4 py-3 text-right">Số tiền</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {selectedBill.items.map((item) => (
                    <tr key={item.id}>
                      <td className="px-4 py-3 text-slate-700">Tháng {item.period}</td>
                      <td className="px-4 py-3 text-slate-700">{item.group}</td>
                      <td className="px-4 py-3 font-semibold text-slate-800">{item.name}</td>
                      <td className="px-4 py-3 text-slate-600">{item.formula}</td>
                      <td className="px-4 py-3 text-right font-semibold text-slate-800">{money(item.amountDue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="space-y-4">
              <Select 
                label="Trạng thái thanh toán" 
                value={Number(paymentForm.amountPaid || 0) >= selectedBill.amountDue ? "PAID" : "UNPAID"}
                onChange={(e) => {
                  if (e.target.value === "PAID") {
                    setPaymentForm({ ...paymentForm, amountPaid: String(selectedBill.amountDue) });
                  } else {
                    setPaymentForm({ ...paymentForm, amountPaid: "" });
                  }
                }}
              >
                <option value="UNPAID">Chưa nộp</option>
                <option value="PAID">Đã nộp</option>
              </Select>
              <Input label="Số tiền đã nộp" type="number" value={paymentForm.amountPaid} onChange={(e) => setPaymentForm({ ...paymentForm, amountPaid: e.target.value })} />
              <Input label="Ngày nộp" type="date" value={paymentForm.paidDate} onChange={(e) => setPaymentForm({ ...paymentForm, paidDate: e.target.value })} />
              <label className="block">
                <span className="mb-1.5 block text-sm font-semibold text-slate-700">Ghi chú</span>
                <textarea rows={3} value={paymentForm.note} onChange={(e) => setPaymentForm({ ...paymentForm, note: e.target.value })} className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100" />
              </label>
              {error && <div className="rounded-xl bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 ring-1 ring-rose-200">{error}</div>}
              <div className="flex flex-wrap justify-between gap-3">
                <div className="flex flex-wrap gap-3">
                  <Button variant="secondary" onClick={() => setSelectedBill(null)}>Hủy</Button>
                  <Button variant="secondary" onClick={() => setHistoryTarget(selectedBill)}>Lịch sử chỉnh sửa</Button>
                  <Button variant="danger" onClick={() => setDeleteConfirm(selectedBill)}>Xóa ghi nhận nộp</Button>
                </div>
                <Button onClick={handleSavePayment}>Lưu</Button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {deleteConfirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
          <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-xl">
            <h3 className="mb-3 text-lg font-black">Xóa ghi nhận nộp tiền</h3>
            <p className="mb-5 text-sm text-slate-600">Bạn có chắc muốn xóa số tiền đã nộp của căn <strong>{deleteConfirm.room}</strong>? Các khoản cần đóng vẫn được giữ lại.</p>
            <div className="flex justify-end gap-3">
              <Button variant="secondary" onClick={() => setDeleteConfirm(null)}>Hủy</Button>
              <Button variant="danger" onClick={handleDeletePayment}>Xóa</Button>
            </div>
          </motion.div>
        </div>
      )}

      {confirmBatchData && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
          <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-xl">
            <h3 className="mb-3 text-lg font-black">Xác nhận lập đợt thu</h3>
            <p className="mb-5 text-sm text-slate-600">
              Bạn có chắc muốn lập đợt thu 
              <strong>
                {confirmBatchData.type === "mandatory" && ` khoản bắt buộc cho tháng ${confirmBatchData.month}/${confirmBatchData.year}`}
                {confirmBatchData.type === "all" && ` tất cả khoản (bắt buộc + điện/nước/gửi xe) cho tháng ${confirmBatchData.month}/${confirmBatchData.year}`}
                {confirmBatchData.type === "utilities" && ` điện/nước/internet cho tháng ${confirmBatchData.month}/${confirmBatchData.year}`}
                {confirmBatchData.type === "vehicles" && ` gửi xe cho tháng ${confirmBatchData.month}/${confirmBatchData.year}`}
              </strong>?
            </p>
            <div className="flex justify-end gap-3">
              <Button variant="secondary" onClick={() => setConfirmBatchData(null)}>Hủy</Button>
              <Button onClick={handleConfirmBatch}>Xác nhận</Button>
            </div>
          </motion.div>
        </div>
      )}

      {historyTarget && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4">
          <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl bg-white p-6 shadow-xl">
            <h3 className="mb-4 text-lg font-black">Lịch sử chỉnh sửa thu phí</h3>
            {historyTarget.history?.length ? (
              <div className="space-y-3">
                {historyTarget.history.map((item) => (
                  <div key={item.id} className="rounded-2xl border border-slate-200 p-4">
                    <p className="font-bold text-slate-900">{item.date}</p>
                    <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-600">
                      {item.changes.map((change, index) => <li key={index}>{change}</li>)}
                    </ul>
                  </div>
                ))}
              </div>
            ) : (
              <p className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">Chưa có lịch sử chỉnh sửa.</p>
            )}
            <div className="mt-5 flex justify-end">
              <Button variant="secondary" onClick={() => setHistoryTarget(null)}>Đóng</Button>
            </div>
          </motion.div>
        </div>
      )}
    </>
  );
}

function Vehicles() {
  const [vehiclesList, setVehiclesList] = useDatabaseState("bluemoon_vehicles", initialVehicles);
  const [filteredVehicles, setFilteredVehicles] = useState(initialVehicles);
  const [showForm, setShowForm] = useState(false);
  const [editingIndex, setEditingIndex] = useState(null);
  const [error, setError] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [searchFilters, setSearchFilters] = useState({
    plate: "",
    type: "",
    room: "",
    slot: "",
  });
  const [formData, setFormData] = useState({
    name: "",
    birthYear: "",
    idCard: "",
    plate: "",
    type: "Ô tô",
    room: "",
    fee: "",
    slot: "",
    status: "USED",
  });

  const handleSearch = () => {
    let results = vehiclesList;

    if (searchFilters.plate.trim()) {
      results = results.filter(v => v.plate.includes(searchFilters.plate.trim()));
    }

    if (searchFilters.type.trim()) {
      results = results.filter(v => v.type.includes(searchFilters.type.trim()));
    }

    if (searchFilters.room.trim()) {
      results = results.filter(v => v.room.includes(searchFilters.room.trim()));
    }

    if (searchFilters.slot.trim()) {
      results = results.filter(v => v.slot.includes(searchFilters.slot.trim()));
    }

    setFilteredVehicles(results);
  };

  const handleResetSearch = () => {
    setSearchFilters({ plate: "", type: "", room: "", slot: "" });
    setFilteredVehicles(vehiclesList);
  };

  const handleAdd = () => {
    const normalizedSlot = formData.slot.trim();
    const normalizedPlate = formData.plate.trim() || "__";
    const normalizedRoom = formData.room.trim() || "__";

    // Biển số có thể để trống; nếu trống sẽ lưu là "__".
    // Các trường còn lại vẫn bắt buộc.
    if (!formData.name.trim() || !formData.birthYear.trim() || !formData.fee || !normalizedSlot) {
      setError("Vui lòng nhập đầy đủ thông tin");
      return;
    }

    // Không cho đăng ký trùng chỗ gửi, trừ chính bản ghi đang sửa.
    const slotUsed = vehiclesList.some((vehicle, index) =>
      index !== editingIndex &&
      vehicle.slot.trim().toLowerCase() === normalizedSlot.toLowerCase()
    );

    if (slotUsed) {
      setError("Chỗ gửi này đã có người gửi");
      return;
    }

    if (editingIndex !== null) {
      const updatedList = [...vehiclesList];
      updatedList[editingIndex] = {
        name: formData.name,
        birthYear: formData.birthYear,
        idCard: formData.idCard,
        plate: normalizedPlate,
        type: formData.type,
        room: normalizedRoom,
        fee: parseInt(formData.fee),
        slot: normalizedSlot,
        status: formData.status,
      };
      setVehiclesList(updatedList);
      setFilteredVehicles(updatedList);
    } else {
      const newVehicle = {
        name: formData.name,
        birthYear: formData.birthYear,
        idCard: formData.idCard,
        plate: normalizedPlate,
        type: formData.type,
        room: normalizedRoom,
        fee: parseInt(formData.fee),
        slot: normalizedSlot,
        status: formData.status,
      };
      const updatedList = [...vehiclesList, newVehicle];
      setVehiclesList(updatedList);
      setFilteredVehicles(updatedList);
    }

    setFormData({
      name: "",
      birthYear: "",
      idCard: "",
      plate: "",
      type: "Ô tô",
      room: "",
      fee: "",
      slot: "",
      status: "USED",
    });
    setError("");
    setEditingIndex(null);
    setShowForm(false);
  };

  const handleEdit = (index, vehicle) => {
    setFormData({
      name: vehicle.name,
      birthYear: vehicle.birthYear,
      idCard: vehicle.idCard,
      plate: vehicle.plate === "__" ? "" : vehicle.plate,
      type: vehicle.type,
      room: vehicle.room,
      fee: vehicle.fee.toString(),
      slot: vehicle.slot,
      status: vehicle.status,
    });
    setEditingIndex(index);
    setShowForm(true);
    setError("");
  };

  const handleDeleteClick = () => {
    if (editingIndex !== null) {
      const vehicle = vehiclesList[editingIndex];
      setDeleteConfirm({ index: editingIndex, plate: vehicle.plate });
    }
  };

  const handleConfirmDelete = () => {
    if (deleteConfirm) {
      const updatedList = vehiclesList.filter((_, i) => i !== deleteConfirm.index);
      setVehiclesList(updatedList);
      setFilteredVehicles(updatedList.filter(v => {
        if (searchFilters.plate.trim() && !v.plate.includes(searchFilters.plate.trim())) return false;
        if (searchFilters.room.trim() && !v.room.includes(searchFilters.room.trim())) return false;
        if (searchFilters.slot.trim() && !v.slot.includes(searchFilters.slot.trim())) return false;
        return true;
      }));
      setDeleteConfirm(null);
      setShowForm(false);
      setEditingIndex(null);
    }
  };

  const handleCancel = () => {
    setFormData({
      name: "",
      birthYear: "",
      idCard: "",
      plate: "",
      type: "Ô tô",
      room: "",
      fee: "",
      slot: "",
      status: "USED",
    });
    setError("");
    setShowForm(false);
    setEditingIndex(null);
  };

  return (
    <>
      <SectionHeader title="Quản lý phí gửi xe" desc="Đăng ký xe cho hộ, huỷ đăng ký, quản lý chỗ gửi và cho thuê chỗ trống." action={<Button onClick={() => { setShowForm(true); setEditingIndex(null); setFormData({ name: "", birthYear: "", idCard: "", plate: "", type: "Ô tô", room: "", fee: "", slot: "", status: "USED" }); }}><Plus className="h-4 w-4" /> Đăng ký xe</Button>} />
      
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="rounded-3xl bg-white p-6 shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <h3 className="mb-4 text-lg font-bold">{editingIndex !== null ? "Chỉnh sửa đăng ký xe" : "Đăng ký xe mới"}</h3>
            <div className="space-y-4">
              <div className="grid gap-4">
                <Input 
                  label="Họ tên" 
                  placeholder="Nguyễn Văn A"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                />
                <Input 
                  label="Năm sinh" 
                  placeholder="1990"
                  value={formData.birthYear}
                  onChange={(e) => setFormData({...formData, birthYear: e.target.value})}
                />
                <Input 
                  label="CCCD/CMND" 
                  placeholder="Có thể bỏ trống"
                  value={formData.idCard}
                  onChange={(e) => setFormData({...formData, idCard: e.target.value})}
                />
              </div>
              <div className="grid gap-4">
                <Select 
                  label="Loại xe" 
                  value={formData.type}
                  onChange={(e) => setFormData({...formData, type: e.target.value})}
                >
                  <option value="Ô tô">Ô tô</option>
                  <option value="Xe máy">Xe máy</option>
                  <option value="Xe đạp">Xe đạp</option>
                </Select>
                <Input 
                  label="Biển số" 
                  placeholder="Có thể bỏ trống, hệ thống sẽ lưu là __"
                  value={formData.plate}
                  onChange={(e) => setFormData({...formData, plate: e.target.value})}
                />
              </div>
              <div className="grid gap-4">
                <Input 
                  label="Căn hộ" 
                  placeholder="1201"
                  value={formData.room}
                  onChange={(e) => setFormData({...formData, room: e.target.value})}
                />
                <Input 
                  label="Chỗ gửi" 
                  placeholder="B1-12"
                  value={formData.slot}
                  onChange={(e) => setFormData({...formData, slot: e.target.value})}
                />
              </div>
              <div className="grid gap-4">
                <Input 
                  label="Phí tháng" 
                  placeholder="1200000"
                  value={formData.fee}
                  onChange={(e) => setFormData({...formData, fee: e.target.value})}
                />
                <Select 
                  label="Trạng thái" 
                  value={formData.status}
                  onChange={(e) => setFormData({...formData, status: e.target.value})}
                >
                  <option value="USED">Đang dùng</option>
                  <option value="RENTED">Cho thuê</option>
                </Select>
              </div>
              {error && <div className="rounded-xl bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 ring-1 ring-rose-200">{error}</div>}
              <div className="flex justify-between gap-3 pt-4">
                <div className="flex gap-3">
                  <Button variant="secondary" onClick={handleCancel}>Hủy</Button>
                  {editingIndex !== null && (
                    <Button variant="danger" onClick={handleDeleteClick}>Xóa xe</Button>
                  )}
                </div>
                <Button onClick={handleAdd}>{editingIndex !== null ? "Lưu" : "Đăng ký"}</Button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="rounded-3xl bg-white p-6 shadow-xl max-w-sm w-full">
            <div className="flex items-center gap-3 mb-4">
              <div className="rounded-full bg-rose-100 p-3">
                <AlertCircle className="h-6 w-6 text-rose-600" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">Xóa đăng ký xe</h3>
            </div>
            <p className="text-slate-600 mb-6">
              Bạn có chắc muốn xóa xe với biển số <strong>{deleteConfirm.plate}</strong>? Hành động này không thể hoàn tác.
            </p>
            <div className="flex gap-3 justify-end">
              <Button variant="secondary" onClick={() => setDeleteConfirm(null)}>Hủy</Button>
              <Button variant="danger" onClick={handleConfirmDelete}>Xóa đăng ký</Button>
            </div>
          </motion.div>
        </div>
      )}

      <div className="mb-5 grid gap-3 md:grid-cols-4">
        <Input 
          label="Biển số" 
          placeholder="VD: 30A-12345"
          value={searchFilters.plate}
          onChange={(e) => setSearchFilters({...searchFilters, plate: e.target.value})}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
        />
        <Input 
          label="Căn hộ" 
          placeholder="Nhập số căn"
          value={searchFilters.room}
          onChange={(e) => setSearchFilters({...searchFilters, room: e.target.value})}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
        />
        <Select 
          label="Loại xe" 
          value={searchFilters.type}
          onChange={(e) => setSearchFilters({...searchFilters, type: e.target.value})}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
        >
            <option value="">Tất cả loại</option>
            <option value="Ô tô">Ô tô</option>
            <option value="Xe máy">Xe máy</option>
            <option value="Xe đạp">Xe đạp</option>
        </Select>
        <Input 
          label="Chỗ gửi" 
          placeholder="VD: B1-12"
          value={searchFilters.slot}
          onChange={(e) => setSearchFilters({...searchFilters, slot: e.target.value})}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
        />
      </div>
      <div className="mb-5 flex gap-3">
        <Button onClick={handleSearch}><Search className="h-4 w-4" /> Tìm kiếm</Button>
        <Button variant="secondary" onClick={handleResetSearch}>Xoá bộ lọc</Button>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-5 py-4">Biển số</th>
                <th className="px-5 py-4">Loại</th>
                <th className="px-5 py-4">Căn hộ</th>
                <th className="px-5 py-4">Chỗ gửi</th>
                <th className="px-5 py-4">Phí tháng</th>
                <th className="px-5 py-4">Trạng thái</th>
                <th className="px-5 py-4 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredVehicles.map((v, idx) => {
                const originalIdx = vehiclesList.findIndex(vehicle => 
                  vehicle.plate === v.plate &&
                  vehicle.slot === v.slot &&
                  vehicle.room === v.room &&
                  vehicle.name === v.name
                );
                return (
                  <tr key={idx} className="hover:bg-slate-50/80">
                    <td className="whitespace-nowrap px-5 py-4 text-slate-700">{v.plate}</td>
                    <td className="whitespace-nowrap px-5 py-4 text-slate-700">{v.type}</td>
                    <td className="whitespace-nowrap px-5 py-4 text-slate-700">{v.room}</td>
                    <td className="whitespace-nowrap px-5 py-4 text-slate-700">{v.slot}</td>
                    <td className="whitespace-nowrap px-5 py-4 text-slate-700">{money(v.fee)}</td>
                    <td className="whitespace-nowrap px-5 py-4 text-slate-700"><Badge tone={v.status === "RENTED" ? "violet" : "green"}>{v.status === "RENTED" ? "Cho thuê" : "Đang dùng"}</Badge></td>
                    <td className="px-5 py-4 text-right">
                      <button onClick={() => handleEdit(originalIdx, v)} className="font-semibold text-sky-700 hover:text-sky-900">Chi tiết</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

function Utilities() {
  const utilityTypes = [
    { value: "ELECTRICITY", label: "Điện" },
    { value: "WATER", label: "Nước" },
    { value: "INTERNET", label: "Internet" },
  ];

  const months = Array.from({ length: 12 }, (_, index) => index + 1);
  const years = [2024, 2025, 2026, 2027, 2028];

  const [unitPrices, setUnitPrices] = useDatabaseState("bluemoon_utility_prices", {
    ELECTRICITY: 3500,
    WATER: 7000,
    INTERNET: 220000,
  });
  const [priceForm, setPriceForm] = useState(unitPrices);
  const [showPriceForm, setShowPriceForm] = useState(false);

  const [utilitiesList, setUtilitiesList] = useDatabaseState("bluemoon_utilities", initialUtilities);
  const [filteredUtilities, setFilteredUtilities] = useState(initialUtilities);
  const [showForm, setShowForm] = useState(false);
  const [editingIndex, setEditingIndex] = useState(null);
  const [error, setError] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [changeReason, setChangeReason] = useState("");
  const [searchFilters, setSearchFilters] = useState({
    room: "",
    type: "",
    month: "",
    year: "",
    status: "",
  });
  const [formData, setFormData] = useState({
    room: "",
    type: "ELECTRICITY",
    month: 5,
    year: 2026,
    oldIndex: "",
    newIndex: "",
    status: "UNPAID",
  });

  const parseNumber = (value) => {
    if (value === "__") return 0;
    const number = Number(value);
    return Number.isNaN(number) ? 0 : number;
  };

  const getUtilityLabel = (type) => {
    const utilityType = utilityTypes.find((item) => item.value === type);
    return utilityType ? utilityType.label : type;
  };

  const getUnitLabel = (type) => {
    if (type === "ELECTRICITY") return "đ/số";
    if (type === "WATER") return "đ/m³";
    return "đ/tháng";
  };

  const calculateAmount = (utility) => {
    if (utility.type === "INTERNET") {
      return parseNumber(unitPrices.INTERNET);
    }

    const oldIndex = parseNumber(utility.oldIndex);
    const newIndex = parseNumber(utility.newIndex);
    return Math.max(0, newIndex - oldIndex) * parseNumber(unitPrices[utility.type]);
  };

  const filterUtilities = (list) => {
    let results = list;

    if (searchFilters.room.trim()) {
      results = results.filter((item) => item.room.includes(searchFilters.room.trim()));
    }

    if (searchFilters.type) {
      results = results.filter((item) => item.type === searchFilters.type);
    }

    if (searchFilters.month) {
      results = results.filter((item) => String(item.month) === String(searchFilters.month));
    }

    if (searchFilters.year) {
      results = results.filter((item) => String(item.year) === String(searchFilters.year));
    }

    if (searchFilters.status) {
      results = results.filter((item) => item.status === searchFilters.status);
    }

    return results;
  };

  const handleSearch = () => {
    setFilteredUtilities(filterUtilities(utilitiesList));
  };

  const handleResetSearch = () => {
    setSearchFilters({
      room: "",
      type: "",
      month: "",
      year: "",
      status: "",
    });
    setFilteredUtilities(utilitiesList);
  };

  const openCreateForm = () => {
    setFormData({
      room: "",
      type: "ELECTRICITY",
      month: 5,
      year: 2026,
      oldIndex: "",
      newIndex: "",
      status: "UNPAID",
    });
    setChangeReason("");
    setError("");
    setEditingIndex(null);
    setShowForm(true);
  };

  const handleEdit = (index, utility) => {
    setFormData({
      room: utility.room,
      type: utility.type,
      month: utility.month,
      year: utility.year,
      oldIndex: utility.type === "INTERNET" ? "" : String(utility.oldIndex),
      newIndex: utility.type === "INTERNET" ? "" : String(utility.newIndex),
      status: utility.status,
    });
    setChangeReason("");
    setError("");
    setEditingIndex(index);
    setShowForm(true);
  };

  const handleTypeChange = (type) => {
    setFormData((prev) => ({
      ...prev,
      type,
      oldIndex: type === "INTERNET" ? "" : prev.oldIndex,
      newIndex: type === "INTERNET" ? "" : prev.newIndex,
    }));
    setError("");
    setChangeReason("");
  };

  const validateUtilityForm = () => {
    if (!formData.room.trim()) {
      return "Vui lòng nhập căn hộ";
    }

    if (formData.type !== "INTERNET") {
      if (formData.oldIndex === "" || formData.newIndex === "") {
        return "Vui lòng nhập chỉ số cũ và chỉ số mới";
      }

      const oldIndex = parseNumber(formData.oldIndex);
      const newIndex = parseNumber(formData.newIndex);

      if (oldIndex < 0 || newIndex < 0) {
        return "Chỉ số không được âm";
      }

      if (newIndex < oldIndex) {
        return "Chỉ số mới phải lớn hơn hoặc bằng chỉ số cũ";
      }

      const oldRecord = editingIndex !== null ? utilitiesList[editingIndex] : null;
      const changedOldIndex =
        oldRecord &&
        oldRecord.type !== "INTERNET" &&
        parseNumber(oldRecord.oldIndex) !== oldIndex;

      if (changedOldIndex && !changeReason.trim()) {
        return "Bạn phải nhập lý do khi thay đổi chỉ số cũ";
      }
    }

    return "";
  };

  const handleSave = () => {
    const validationError = validateUtilityForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    const savedUtility = {
      id: editingIndex !== null ? utilitiesList[editingIndex].id : Date.now(),
      room: formData.room.trim(),
      type: formData.type,
      month: Number(formData.month),
      year: Number(formData.year),
      oldIndex: formData.type === "INTERNET" ? "__" : parseNumber(formData.oldIndex),
      newIndex: formData.type === "INTERNET" ? "__" : parseNumber(formData.newIndex),
      status: formData.status,
      changeReason: changeReason.trim(),
    };

    let updatedList;
    if (editingIndex !== null) {
      updatedList = [...utilitiesList];
      updatedList[editingIndex] = savedUtility;
    } else {
      updatedList = [...utilitiesList, savedUtility];
    }

    setUtilitiesList(updatedList);
    setFilteredUtilities(filterUtilities(updatedList));
    setShowForm(false);
    setEditingIndex(null);
    setChangeReason("");
    setError("");
  };

  const handleDeleteClick = () => {
    if (editingIndex !== null) {
      const utility = utilitiesList[editingIndex];
      setDeleteConfirm({
        index: editingIndex,
        room: utility.room,
        type: getUtilityLabel(utility.type),
        month: utility.month,
        year: utility.year,
      });
    }
  };

  const handleConfirmDelete = () => {
    if (!deleteConfirm) return;

    const updatedList = utilitiesList.filter((_, index) => index !== deleteConfirm.index);
    setUtilitiesList(updatedList);
    setFilteredUtilities(filterUtilities(updatedList));
    setDeleteConfirm(null);
    setShowForm(false);
    setEditingIndex(null);
    setError("");
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingIndex(null);
    setChangeReason("");
    setError("");
  };

  const handleOpenPriceForm = () => {
    setPriceForm(unitPrices);
    setShowPriceForm(true);
  };

  const handleSavePrice = () => {
    if (
      parseNumber(priceForm.ELECTRICITY) <= 0 ||
      parseNumber(priceForm.WATER) <= 0 ||
      parseNumber(priceForm.INTERNET) <= 0
    ) {
      alert("Đơn giá phải lớn hơn 0");
      return;
    }

    setUnitPrices({
      ELECTRICITY: parseNumber(priceForm.ELECTRICITY),
      WATER: parseNumber(priceForm.WATER),
      INTERNET: parseNumber(priceForm.INTERNET),
    });
    setShowPriceForm(false);
  };

  const shouldShowChangeReason = (() => {
    if (editingIndex === null || formData.type === "INTERNET") return false;
    const oldRecord = utilitiesList[editingIndex];
    if (!oldRecord || oldRecord.type === "INTERNET") return false;
    return parseNumber(oldRecord.oldIndex) !== parseNumber(formData.oldIndex);
  })();

  return (
    <>
      <SectionHeader
        title="Quản lý phí điện, nước, internet"
        desc="Nhập hoá đơn theo từng hộ và từng tháng, ghi nhận đã nộp, tra cứu theo hộ."
        action={
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={handleOpenPriceForm}>
              Thay đổi đơn giá
            </Button>
            <Button onClick={openCreateForm}>
              <Plus className="h-4 w-4" /> Nhập hóa đơn
            </Button>
          </div>
        }
      />

      <Card className="mb-5">
        <div className="grid gap-4 md:grid-cols-5">
          <Input
            label="Tìm theo căn hộ"
            placeholder="VD: 1201"
            value={searchFilters.room}
            onChange={(e) => setSearchFilters({ ...searchFilters, room: e.target.value })}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          />
          <Select
            label="Loại hóa đơn"
            value={searchFilters.type}
            onChange={(e) => setSearchFilters({ ...searchFilters, type: e.target.value })}
          >
            <option value="">Tất cả</option>
            <option value="ELECTRICITY">Điện</option>
            <option value="WATER">Nước</option>
            <option value="INTERNET">Internet</option>
          </Select>
          <Select
            label="Tháng"
            value={searchFilters.month}
            onChange={(e) => setSearchFilters({ ...searchFilters, month: e.target.value })}
          >
            <option value="">Tất cả</option>
            {months.map((month) => (
              <option key={month} value={month}>Tháng {month}</option>
            ))}
          </Select>
          <Select
            label="Năm"
            value={searchFilters.year}
            onChange={(e) => setSearchFilters({ ...searchFilters, year: e.target.value })}
          >
            <option value="">Tất cả</option>
            {years.map((year) => (
              <option key={year} value={year}>{year}</option>
            ))}
          </Select>
          <Select
            label="Trạng thái"
            value={searchFilters.status}
            onChange={(e) => setSearchFilters({ ...searchFilters, status: e.target.value })}
          >
            <option value="">Tất cả</option>
            <option value="PAID">Đã nộp</option>
            <option value="UNPAID">Chưa nộp</option>
          </Select>
        </div>
        <div className="mt-4 flex gap-3">
          <Button onClick={handleSearch}>
            <Search className="h-4 w-4" /> Tìm kiếm
          </Button>
          <Button variant="secondary" onClick={handleResetSearch}>
            Xoá bộ lọc
          </Button>
        </div>
      </Card>

      {showPriceForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="w-full max-w-md rounded-3xl bg-white p-6 shadow-xl">
            <h3 className="mb-4 text-lg font-bold">Thay đổi đơn giá</h3>
            <div className="space-y-4">
              <Input
                label="Đơn giá điện (đ/số)"
                type="number"
                min="1"
                value={priceForm.ELECTRICITY}
                onChange={(e) => setPriceForm({ ...priceForm, ELECTRICITY: e.target.value })}
              />
              <Input
                label="Đơn giá nước (đ/m³)"
                type="number"
                min="1"
                value={priceForm.WATER}
                onChange={(e) => setPriceForm({ ...priceForm, WATER: e.target.value })}
              />
              <Input
                label="Đơn giá Internet (đ/tháng)"
                type="number"
                min="1"
                value={priceForm.INTERNET}
                onChange={(e) => setPriceForm({ ...priceForm, INTERNET: e.target.value })}
              />
              <div className="flex justify-end gap-3 pt-2">
                <Button variant="secondary" onClick={() => setShowPriceForm(false)}>Hủy</Button>
                <Button onClick={handleSavePrice}>Lưu đơn giá</Button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <h3 className="mb-4 text-lg font-bold">
              {editingIndex !== null ? "Chi tiết hóa đơn" : "Nhập hóa đơn mới"}
            </h3>

            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <Input
                  label="Căn hộ"
                  placeholder="VD: 1201"
                  value={formData.room}
                  onChange={(e) => setFormData({ ...formData, room: e.target.value })}
                />
                <Select
                  label="Loại hóa đơn"
                  value={formData.type}
                  onChange={(e) => handleTypeChange(e.target.value)}
                >
                  <option value="ELECTRICITY">Điện</option>
                  <option value="WATER">Nước</option>
                  <option value="INTERNET">Internet</option>
                </Select>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <Select
                  label="Tháng"
                  value={formData.month}
                  onChange={(e) => setFormData({ ...formData, month: Number(e.target.value) })}
                >
                  {months.map((month) => (
                    <option key={month} value={month}>Tháng {month}</option>
                  ))}
                </Select>
                <Select
                  label="Năm"
                  value={formData.year}
                  onChange={(e) => setFormData({ ...formData, year: Number(e.target.value) })}
                >
                  {years.map((year) => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </Select>
                <Select
                  label="Trạng thái"
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                >
                  <option value="UNPAID">Chưa nộp</option>
                  <option value="PAID">Đã nộp</option>
                </Select>
              </div>

              {formData.type === "INTERNET" ? (
                <div className="grid gap-4 md:grid-cols-2">
                  <Input label="Chỉ số cũ" value="__" disabled />
                  <Input label="Chỉ số mới" value="__" disabled />
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  <Input
                    label={formData.type === "ELECTRICITY" ? "Chỉ số cũ điện" : "Chỉ số cũ nước"}
                    type="number"
                    min="0"
                    value={formData.oldIndex}
                    onChange={(e) => setFormData({ ...formData, oldIndex: e.target.value })}
                  />
                  <Input
                    label={formData.type === "ELECTRICITY" ? "Chỉ số mới điện" : "Chỉ số mới nước"}
                    type="number"
                    min="0"
                    value={formData.newIndex}
                    onChange={(e) => setFormData({ ...formData, newIndex: e.target.value })}
                  />
                </div>
              )}

              {shouldShowChangeReason && (
                <label className="block">
                  <span className="mb-1.5 block text-sm font-semibold text-slate-700">
                    Lý do thay đổi chỉ số cũ
                  </span>
                  <textarea
                    rows={3}
                    value={changeReason}
                    onChange={(e) => setChangeReason(e.target.value)}
                    placeholder="Nhập lý do thay đổi chỉ số cũ..."
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
                  />
                </label>
              )}

              <div className="rounded-2xl bg-slate-50 p-4 text-sm">
                <div className="flex justify-between">
                  <span className="font-semibold text-slate-600">Đơn giá:</span>
                  <span className="font-bold text-slate-900">
                    {money(unitPrices[formData.type])} / {getUnitLabel(formData.type).replace("đ/", "")}
                  </span>
                </div>
                <div className="mt-2 flex justify-between">
                  <span className="font-semibold text-slate-600">Số tiền tạm tính:</span>
                  <span className="font-black text-sky-700">
                    {money(calculateAmount({
                      type: formData.type,
                      oldIndex: formData.type === "INTERNET" ? "__" : formData.oldIndex,
                      newIndex: formData.type === "INTERNET" ? "__" : formData.newIndex,
                    }))}
                  </span>
                </div>
              </div>

              {error && (
                <div className="rounded-xl bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 ring-1 ring-rose-200">
                  {error}
                </div>
              )}

              <div className="flex justify-between gap-3 pt-2">
                <div>
                  {editingIndex !== null && (
                    <Button variant="danger" onClick={handleDeleteClick}>
                      Xóa
                    </Button>
                  )}
                </div>
                <div className="flex gap-3">
                  <Button variant="secondary" onClick={handleCancel}>Hủy</Button>
                  <Button onClick={handleSave}>Lưu</Button>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center gap-3">
              <div className="rounded-full bg-rose-100 p-3">
                <AlertCircle className="h-6 w-6 text-rose-600" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">Xóa hóa đơn</h3>
            </div>
            <p className="mb-6 text-slate-600">
              Bạn có chắc muốn xóa hóa đơn <strong>{deleteConfirm.type}</strong> căn <strong>{deleteConfirm.room}</strong> tháng <strong>{deleteConfirm.month}/{deleteConfirm.year}</strong>?
            </p>
            <div className="flex justify-end gap-3">
              <Button variant="secondary" onClick={() => setDeleteConfirm(null)}>Hủy</Button>
              <Button variant="danger" onClick={handleConfirmDelete}>Xóa</Button>
            </div>
          </motion.div>
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-5 py-4">Căn hộ</th>
                <th className="px-5 py-4">Loại hóa đơn</th>
                <th className="px-5 py-4">Tháng/Năm</th>
                <th className="px-5 py-4">Chỉ số cũ</th>
                <th className="px-5 py-4">Chỉ số mới</th>
                <th className="px-5 py-4">Đơn giá</th>
                <th className="px-5 py-4">Số tiền</th>
                <th className="px-5 py-4">Trạng thái</th>
                <th className="px-5 py-4 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredUtilities.map((utility) => {
                const originalIdx = utilitiesList.findIndex((item) => item.id === utility.id);
                return (
                  <tr key={utility.id} className="hover:bg-slate-50/80">
                    <td className="whitespace-nowrap px-5 py-4 text-slate-700">{utility.room}</td>
                    <td className="whitespace-nowrap px-5 py-4 text-slate-700">{getUtilityLabel(utility.type)}</td>
                    <td className="whitespace-nowrap px-5 py-4 text-slate-700">{utility.month}/{utility.year}</td>
                    <td className="whitespace-nowrap px-5 py-4 text-slate-700">{utility.type === "INTERNET" ? "__" : utility.oldIndex}</td>
                    <td className="whitespace-nowrap px-5 py-4 text-slate-700">{utility.type === "INTERNET" ? "__" : utility.newIndex}</td>
                    <td className="whitespace-nowrap px-5 py-4 text-slate-700">
                      {money(unitPrices[utility.type])} / {getUnitLabel(utility.type).replace("đ/", "")}
                    </td>
                    <td className="whitespace-nowrap px-5 py-4 font-bold text-slate-900">
                      {money(calculateAmount(utility))}
                    </td>
                    <td className="whitespace-nowrap px-5 py-4 text-slate-700">
                      <StatusBadge status={utility.status} />
                    </td>
                    <td className="px-5 py-4 text-right">
                      <button onClick={() => handleEdit(originalIdx, utility)} className="font-semibold text-sky-700 hover:text-sky-900">
                        Chi tiết
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

function Complaints({ role, complaintsList, setComplaintsList, initialComplaintId, onInitialComplaintHandled }) {
  const [selectedComplaint, setSelectedComplaint] = useState(() =>
    initialComplaintId ? complaintsList.find((item) => item.id === initialComplaintId) || null : null
  );
  const [handlingContent, setHandlingContent] = useState(() => selectedComplaint?.response || "");
  const [handlingStatus, setHandlingStatus] = useState(() => selectedComplaint?.status || "IN_PROGRESS");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newComplaint, setNewComplaint] = useState({ title: "", category: "Phí", content: "" });
  const [error, setError] = useState("");

  const openDetail = (complaint) => {
    setSelectedComplaint(complaint);
    setHandlingContent(complaint.response || "");
    setHandlingStatus(complaint.status || "IN_PROGRESS");
    setError("");
    onInitialComplaintHandled?.();
  };

  const closeDetail = () => {
    setSelectedComplaint(null);
    setHandlingContent("");
    setHandlingStatus("IN_PROGRESS");
    setError("");
  };

  const handleSave = () => {
    if (role === "ADMIN" && !handlingContent.trim()) {
      setError("Vui lòng nhập nội dung xử lý");
      return;
    }

    setComplaintsList((prev) =>
      prev.map((item) =>
        item.id === selectedComplaint.id
          ? {
              ...item,
              response: handlingContent.trim(),
              status: handlingStatus,
            }
          : item
      )
    );

    closeDetail();
  };

  const handleCreateComplaint = () => {
    if (!newComplaint.title.trim() || !newComplaint.content.trim()) {
      setError("Vui lòng nhập tiêu đề và nội dung khiếu nại");
      return;
    }

    const createdComplaint = {
      id: `KN-${Date.now()}`,
      title: newComplaint.title.trim(),
      sender: "Căn 1201",
      category: newComplaint.category,
      content: newComplaint.content.trim(),
      response: "",
      status: "IN_PROGRESS",
    };

    setComplaintsList((prev) => [createdComplaint, ...prev]);
    setNewComplaint({ title: "", category: "Phí", content: "" });
    setShowCreateForm(false);
    setError("");
  };

  return (
    <>
      <SectionHeader
        title={role === "ADMIN" ? "Xử lý khiếu nại" : "Khiếu nại của tôi"}
        desc={
          role === "ADMIN"
            ? "Admin xem nội dung khiếu nại, nhập nội dung xử lý và cập nhật trạng thái."
            : "Cư dân gửi khiếu nại và theo dõi trạng thái xử lý."
        }
        action={
          role === "ADMIN" ? null : (
            <Button onClick={() => setShowCreateForm(true)}>
              <Plus className="h-4 w-4" /> Gửi khiếu nại
            </Button>
          )
        }
      />

      {showCreateForm && role !== "ADMIN" && (
        <Card className="mb-5">
          <h3 className="mb-4 text-lg font-black">Gửi khiếu nại mới</h3>
          <div className="space-y-4">
            <Input label="Tiêu đề" value={newComplaint.title} onChange={(e) => setNewComplaint({ ...newComplaint, title: e.target.value })} />
            <Select label="Loại khiếu nại" value={newComplaint.category} onChange={(e) => setNewComplaint({ ...newComplaint, category: e.target.value })}>
              <option>Phí</option>
              <option>An ninh</option>
              <option>Vệ sinh</option>
              <option>Khác</option>
            </Select>
            <label className="block">
              <span className="mb-1.5 block text-sm font-semibold text-slate-700">Nội dung</span>
              <textarea rows={4} value={newComplaint.content} onChange={(e) => setNewComplaint({ ...newComplaint, content: e.target.value })} className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100" />
            </label>
            {error && <div className="rounded-xl bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 ring-1 ring-rose-200">{error}</div>}
            <div className="flex justify-end gap-3">
              <Button variant="secondary" onClick={() => { setShowCreateForm(false); setError(""); }}>Hủy</Button>
              <Button onClick={handleCreateComplaint}>Gửi khiếu nại</Button>
            </div>
          </div>
        </Card>
      )}

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-5 py-4">Mã</th>
                <th className="px-5 py-4">Tiêu đề</th>
                <th className="px-5 py-4">Người gửi</th>
                <th className="px-5 py-4">Loại</th>
                <th className="px-5 py-4">Trạng thái</th>
                <th className="px-5 py-4 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {complaintsList.map((complaint) => (
                <tr key={complaint.id} className="hover:bg-slate-50/80">
                  <td className="px-5 py-4 text-slate-700">{complaint.id}</td>
                  <td className="px-5 py-4 font-semibold text-slate-800">{complaint.title}</td>
                  <td className="px-5 py-4 text-slate-700">{complaint.sender}</td>
                  <td className="px-5 py-4 text-slate-700">{complaint.category}</td>
                  <td className="px-5 py-4"><StatusBadge status={complaint.status} /></td>
                  <td className="px-5 py-4 text-right">
                    <button onClick={() => openDetail(complaint)} className="font-semibold text-sky-700 hover:text-sky-900">Chi tiết</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {selectedComplaint && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white p-6 shadow-xl">
            <h3 className="mb-4 text-lg font-black">Chi tiết khiếu nại</h3>
            <div className="mb-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-700">
              <p><strong>Mã:</strong> {selectedComplaint.id}</p>
              <p><strong>Tiêu đề:</strong> {selectedComplaint.title}</p>
              <p><strong>Người gửi:</strong> {selectedComplaint.sender}</p>
              <p><strong>Loại:</strong> {selectedComplaint.category}</p>
              <p className="mt-2"><strong>Nội dung:</strong></p>
              <p>{selectedComplaint.content}</p>
            </div>

            <div className="space-y-4">
              <label className="block">
                <span className="mb-1.5 block text-sm font-semibold text-slate-700">Nội dung xử lý</span>
                <textarea
                  rows={5}
                  value={handlingContent}
                  onChange={(e) => setHandlingContent(e.target.value)}
                  disabled={role !== "ADMIN"}
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100 disabled:bg-slate-50"
                  placeholder="Nhập nội dung xử lý..."
                />
              </label>
              <Select label="Trạng thái" value={handlingStatus} onChange={(e) => setHandlingStatus(e.target.value)}>
                <option value="IN_PROGRESS">Đang xử lý</option>
                <option value="RESOLVED">Đã giải quyết</option>
              </Select>
              {error && <div className="rounded-xl bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 ring-1 ring-rose-200">{error}</div>}
              <div className="flex justify-end gap-3">
                <Button variant="secondary" onClick={closeDetail}>Hủy</Button>
                {role === "ADMIN" && <Button onClick={handleSave}>Lưu</Button>}
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </>
  );
}

function Notifications({ role, notificationList, setNotificationList, initialNotificationId, onInitialNotificationHandled }) {
  const floors = Array.from({ length: 30 }, (_, index) => index + 1);

  const getFloorType = (floor) => {
    const floorNumber = Number(floor);
    if (floorNumber === 1) return "Kiot";
    if (floorNumber >= 2 && floorNumber <= 5) return "Tầng đế";
    if (floorNumber >= 6 && floorNumber <= 29) return "Tầng nhà ở";
    return "Penthouse";
  };

  const getRoomsByFloor = (floor) => {
    const floorNumber = Number(floor);
    return Array.from({ length: 10 }, (_, index) => {
      const roomNumber = String(index + 1).padStart(2, "0");
      if (floorNumber === 1) return `K${roomNumber}`;
      if (floorNumber >= 2 && floorNumber <= 5) return `D${floorNumber}${roomNumber}`;
      if (floorNumber === 30) return `PH${roomNumber}`;
      return `${floorNumber}${roomNumber}`;
    });
  };

  const firstFloor = "1";
  const firstRoom = getRoomsByFloor(firstFloor)[0];

  const [showCompose, setShowCompose] = useState(false);
  const [selectedNotificationId, setSelectedNotificationId] = useState(initialNotificationId || null);
  const [error, setError] = useState("");
  const [composeData, setComposeData] = useState({
    title: "",
    content: "",
    scope: "ALL",
    floor: firstFloor,
    room: firstRoom,
  });

  const selectedNotification = notificationList.find((item) => item.id === selectedNotificationId);

  const handleScopeChange = (value) => {
    const rooms = getRoomsByFloor(composeData.floor);
    setComposeData({
      ...composeData,
      scope: value,
      room: rooms[0],
    });
  };

  const handleFloorChange = (value) => {
    const rooms = getRoomsByFloor(value);
    setComposeData({
      ...composeData,
      floor: value,
      room: rooms[0],
    });
  };

  const getScopeLabel = () => {
    if (composeData.scope === "ALL") return "Toàn chung cư";
    if (composeData.scope === "FLOOR") {
      return `Tầng ${composeData.floor} - ${getFloorType(composeData.floor)}`;
    }
    return `Tầng ${composeData.floor} - ${getFloorType(composeData.floor)} • Phòng ${composeData.room}`;
  };

  const handleSendNotification = () => {
    if (!composeData.title.trim() || !composeData.content.trim()) {
      setError("Vui lòng nhập tiêu đề và nội dung thông báo");
      return;
    }

    const newNotification = {
      id: Date.now(),
      title: composeData.title.trim(),
      content: composeData.content.trim(),
      scope: getScopeLabel(),
      date: new Date().toLocaleDateString("vi-VN"),
      read: false,
    };

    setNotificationList((prev) => [newNotification, ...prev]);
    setComposeData({
      title: "",
      content: "",
      scope: "ALL",
      floor: firstFloor,
      room: firstRoom,
    });
    setError("");
    setShowCompose(false);
  };

  const handleCancelCompose = () => {
    setComposeData({
      title: "",
      content: "",
      scope: "ALL",
      floor: firstFloor,
      room: firstRoom,
    });
    setError("");
    setShowCompose(false);
  };

  const closeDetail = () => {
    setSelectedNotificationId(null);
    onInitialNotificationHandled?.();
  };

  const handleToggleRead = () => {
    if (!selectedNotification) return;

    setNotificationList((prev) =>
      prev.map((item) =>
        item.id === selectedNotification.id
          ? { ...item, read: !selectedNotification.read }
          : item
      )
    );
    setSelectedNotificationId(null);
    onInitialNotificationHandled?.();
  };

  return (
    <>
      <SectionHeader
        title="Gửi/Xem thông báo"
        desc="Admin soạn thông báo theo toàn chung cư, theo tầng hoặc theo hộ; cư dân xem thông báo nhận được."
        action={
          role === "ADMIN" ? (
            <Button onClick={() => setShowCompose(true)}>
              <Plus className="h-4 w-4" /> Soạn thông báo
            </Button>
          ) : null
        }
      />

      {role === "ADMIN" && showCompose && (
        <Card className="mb-5">
          <h3 className="mb-4 text-lg font-black">Soạn thông báo mới</h3>
          <div className="space-y-4">
            <Input
              label="Tiêu đề"
              placeholder="Nhập tiêu đề thông báo"
              value={composeData.title}
              onChange={(e) => setComposeData({ ...composeData, title: e.target.value })}
            />

            <Select
              label="Phạm vi"
              value={composeData.scope}
              onChange={(e) => handleScopeChange(e.target.value)}
            >
              <option value="ALL">Toàn chung cư</option>
              <option value="FLOOR">Theo tầng</option>
              <option value="APARTMENT">Theo hộ</option>
            </Select>

            {composeData.scope === "FLOOR" && (
              <Select
                label="Chọn tầng"
                value={composeData.floor}
                onChange={(e) => handleFloorChange(e.target.value)}
              >
                {floors.map((floor) => (
                  <option key={floor} value={floor}>
                    Tầng {floor} - {getFloorType(floor)}
                  </option>
                ))}
              </Select>
            )}

            {composeData.scope === "APARTMENT" && (
              <div className="grid gap-4 md:grid-cols-2">
                <Select
                  label="Chọn tầng"
                  value={composeData.floor}
                  onChange={(e) => handleFloorChange(e.target.value)}
                >
                  {floors.map((floor) => (
                    <option key={floor} value={floor}>
                      Tầng {floor} - {getFloorType(floor)}
                    </option>
                  ))}
                </Select>

                <Select
                  label="Chọn phòng"
                  value={composeData.room}
                  onChange={(e) => setComposeData({ ...composeData, room: e.target.value })}
                >
                  {getRoomsByFloor(composeData.floor).map((room) => (
                    <option key={room} value={room}>
                      Phòng {room}
                    </option>
                  ))}
                </Select>
              </div>
            )}

            <label className="block">
              <span className="mb-1.5 block text-sm font-semibold text-slate-700">
                Nội dung
              </span>
              <textarea
                rows={5}
                value={composeData.content}
                onChange={(e) => setComposeData({ ...composeData, content: e.target.value })}
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
                placeholder="Nhập nội dung thông báo..."
              />
            </label>

            {error && (
              <div className="rounded-xl bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 ring-1 ring-rose-200">
                {error}
              </div>
            )}

            <div className="flex justify-end gap-3">
              <Button variant="secondary" onClick={handleCancelCompose}>Hủy</Button>
              <Button onClick={handleSendNotification}>Gửi thông báo</Button>
            </div>
          </div>
        </Card>
      )}

      <Card>
        <div className="space-y-3">
          {notificationList.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                setSelectedNotificationId(item.id);
                onInitialNotificationHandled?.();
              }}
              className="flex w-full items-start justify-between rounded-2xl border border-slate-200 p-4 text-left transition hover:bg-slate-50"
            >
              <div className="flex gap-3">
                {item.read ? (
                  <CheckCircle2 className="mt-1 h-5 w-5 text-emerald-600" />
                ) : (
                  <AlertCircle className="mt-1 h-5 w-5 text-sky-600" />
                )}
                <div>
                  <p className="font-black text-slate-900">{item.title}</p>
                  <p className="mt-1 text-sm text-slate-500">
                    {item.scope} • {item.date}
                  </p>
                </div>
              </div>
              <Badge tone={item.read ? "green" : "blue"}>
                {item.read ? "Đã đọc" : "Chưa đọc"}
              </Badge>
            </button>
          ))}
        </div>
      </Card>

      {selectedNotification && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={closeDetail}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            onClick={(e) => e.stopPropagation()}
            className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-3xl bg-white p-6 shadow-xl"
          >
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <h3 className="text-xl font-black text-slate-900">
                  {selectedNotification.title}
                </h3>
                <p className="mt-1 text-sm text-slate-500">
                  {selectedNotification.scope} • {selectedNotification.date}
                </p>
              </div>
              <Badge tone={selectedNotification.read ? "green" : "blue"}>
                {selectedNotification.read ? "Đã đọc" : "Chưa đọc"}
              </Badge>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-700">
              {selectedNotification.content}
            </div>

            <div className="mt-5 flex justify-end gap-3">
              <Button variant="secondary" onClick={closeDetail}>
                Đóng
              </Button>
              <Button onClick={handleToggleRead}>
                {selectedNotification.read ? "Đánh dấu là chưa đọc" : "Đã đọc"}
              </Button>
            </div>

            <p className="mt-3 text-xs text-slate-500">
              Bấm ra ngoài khung thông báo sẽ đóng chi tiết và giữ nguyên trạng thái hiện tại.
            </p>
          </motion.div>
        </div>
      )}
    </>
  );
}

function Statistics() {
  return (
    <>
      <SectionHeader title="Thống kê và xuất file" desc="Thống kê đợt thu, đóng góp, dân cư và xuất báo cáo Excel/PDF." action={<div className="flex gap-2"><Button variant="secondary"><Download className="h-4 w-4" /> Excel</Button><Button><Download className="h-4 w-4" /> PDF</Button></div>} />
      <Card className="mb-6">
        <div className="grid gap-4 md:grid-cols-4">
          <Select label="Loại báo cáo"><option>Tình trạng đợt thu</option><option>Đóng góp</option><option>Dân cư</option><option>Theo hộ gia đình</option></Select>
          <Input label="Từ ngày" type="date" />
          <Input label="Đến ngày" type="date" />
          <Select label="Định dạng"><option>Excel</option><option>PDF</option></Select>
        </div>
      </Card>
      <div className="grid gap-4 md:grid-cols-3">
        <Card><p className="text-sm font-semibold text-slate-500">Tổng phải thu</p><p className="mt-2 text-3xl font-black">{money(245600000)}</p></Card>
        <Card><p className="text-sm font-semibold text-slate-500">Đã thu</p><p className="mt-2 text-3xl font-black text-emerald-700">{money(198300000)}</p></Card>
        <Card><p className="text-sm font-semibold text-slate-500">Còn thiếu</p><p className="mt-2 text-3xl font-black text-rose-700">{money(47300000)}</p></Card>
      </div>
    </>
  );
}

function MyFees() {
  const rows = [
    { room: "1201", owner: "Hộ của tôi", due: 532000, paid: 532000, status: "PAID" },
    { room: "1201", owner: "Hộ của tôi", due: 452000, paid: 0, status: "UNPAID" },
  ];
  return (
    <>
      <SectionHeader title="Khoản phí của tôi" desc="Cư dân chỉ xem được khoản phí và lịch sử nộp của hộ mình." />
      <DataTable columns={[
        { key: "room", label: "Căn hộ" },
        { key: "owner", label: "Hộ" },
        { key: "due", label: "Phải nộp", render: (r) => money(r.due) },
        { key: "paid", label: "Đã nộp", render: (r) => money(r.paid) },
        { key: "status", label: "Trạng thái", render: (r) => <StatusBadge status={r.status} /> },
      ]} rows={rows} />
    </>
  );
}

function Profile() {
  return (
    <>
      <SectionHeader title="Thông tin cá nhân" desc="Cập nhật thông tin cá nhân và đổi mật khẩu tài khoản." />
      <Card className="max-w-3xl">
        <div className="grid gap-4 md:grid-cols-2">
          <Input label="Họ tên" defaultValue="Cư dân căn 1201" />
          <Input label="Email" defaultValue="resident@email.com" />
          <Input label="Số điện thoại" defaultValue="09xxxxxxxx" />
          <Input label="Căn hộ" defaultValue="1201" />
          <Input label="Mật khẩu cũ" type="password" />
          <Input label="Mật khẩu mới" type="password" />
        </div>
        <div className="mt-5 flex justify-end"><Button>Lưu thay đổi</Button></div>
      </Card>
    </>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}

function AppContent() {
  const [user, setUser] = useState(null);
  const [registrations, setRegistrations] = useDatabaseState("bluemoon_registrations", initialRegistrations);
  const [feesList, setFeesList] = useDatabaseState("bluemoon_fees", initialFeeCatalog);
  const [paymentRecords, setPaymentRecords] = useDatabaseState(
    "bluemoon_payments",
    buildInitialPaymentRecords(initialFeeCatalog)
  );
  const [complaintsList, setComplaintsList] = useDatabaseState("bluemoon_complaints", complaints);
  const [notificationList, setNotificationList] = useDatabaseState(
    "bluemoon_notifications",
    normalizeNotifications(notifications)
  );

  const syncPaymentsForMandatoryFee = (fee, month = new Date().getMonth() + 1, year = new Date().getFullYear()) => {
    if (!fee || fee.type !== "MANDATORY" || fee.status !== "ACTIVE") return;

    setPaymentRecords((prev) => {
      const generated = buildPaymentRecordsForFee(fee, month, year, prev);
      const updatedExisting = prev.map((record) => {
        if (record.feeId !== fee.id || Number(record.month) !== Number(month) || Number(record.year) !== Number(year)) {
          return record;
        }

        const household = getHouseholds().find((item) => item.room === record.room);
        const amountDue = household ? calculateMandatoryAmount(fee, household) : record.amountDue;

        return {
          ...record,
          feeName: fee.name,
          chargeMethod: fee.chargeMethod,
          unitPrice: Number(fee.unitPrice || 0),
          amountDue,
          status: calculatePaymentStatus(amountDue, record.amountPaid),
        };
      });

      return [...updatedExisting, ...generated];
    });
  };

  const removePaymentsForFee = (feeId) => {
    setPaymentRecords((prev) => prev.filter((record) => record.feeId !== feeId));
  };

  return user ? (
    <Layout
      user={user}
      setUser={setUser}
      registrations={registrations}
      setRegistrations={setRegistrations}
      feesList={feesList}
      setFeesList={setFeesList}
      paymentRecords={paymentRecords}
      setPaymentRecords={setPaymentRecords}
      syncPaymentsForMandatoryFee={syncPaymentsForMandatoryFee}
      removePaymentsForFee={removePaymentsForFee}
      complaintsList={complaintsList}
      setComplaintsList={setComplaintsList}
      notificationList={notificationList}
      setNotificationList={setNotificationList}
    />
  ) : (
    <Login setUser={setUser} />
  );
}
