import {
  Home,
  CheckCircle2,
  UserRoundCog,
  Building2,
  Users,
  WalletCards,
  ReceiptText,
  Car,
  MessageSquareWarning,
  Bell,
  BarChart3,
  KeyRound,
} from "lucide-react";

export const adminNav = [
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

export const residentNav = [
  { key: "dashboard", label: "Dashboard", icon: Home },
  { key: "myFees", label: "Khoản phí của tôi", icon: WalletCards },
  { key: "vehicles", label: "Gửi xe", icon: Car },
  { key: "complaints", label: "Khiếu nại của tôi", icon: MessageSquareWarning },
  { key: "notifications", label: "Thông báo", icon: Bell },
  { key: "profile", label: "Thông tin cá nhân", icon: KeyRound },
];

export const apartments = [
  { code: "1201", floor: 12, area: 76, status: "OCCUPIED", owner: "Nguyễn Minh Anh", members: 4 },
  { code: "1202", floor: 12, area: 68, status: "AVAILABLE", owner: "—", members: 0 },
  { code: "1808", floor: 18, area: 92, status: "OCCUPIED", owner: "Trần Quốc Bảo", members: 5 },
  { code: "2405", floor: 24, area: 81, status: "OCCUPIED", owner: "Lê Hoài Nam", members: 3 },
];

export const residents = [
  { name: "Nguyễn Minh Anh", room: "1201", birthYear: "1985", idCard: "001201xxxx", relation: "Chủ hộ", status: "PERMANENT" },
  { name: "Phạm Lan Hương", room: "1201", birthYear: "1988", idCard: "001202xxxx", relation: "Vợ", status: "PERMANENT" },
  { name: "Trần Quốc Bảo", room: "1808", birthYear: "1982", idCard: "001203xxxx", relation: "Chủ hộ", status: "TEMPORARY" },
  { name: "Lê Hoài Nam", room: "2405", birthYear: "1980", idCard: "001204xxxx", relation: "Chủ hộ", status: "PERMANENT" },
];

export const fees = [
  { name: "Phí quản lý tháng 05/2026", type: "MANDATORY", unit: "PER_M2", price: 7000, status: "ACTIVE" },
  { name: "Phí dịch vụ tháng 05/2026", type: "MANDATORY", unit: "PER_M2", price: 12000, status: "ACTIVE" },
  { name: "Quỹ vì người nghèo", type: "DONATION", unit: "NONE", price: 0, status: "ACTIVE" },
];

export const payments = [
  { room: "1201", owner: "Nguyễn Minh Anh", due: 1452000, paid: 1452000, status: "PAID" },
  { room: "1808", owner: "Trần Quốc Bảo", due: 1756000, paid: 1756000, status: "PAID" },
  { room: "2405", owner: "Lê Hoài Nam", due: 1539000, paid: 0, status: "UNPAID" },
];

export const initialVehicles = [
  { name: "Trần Quốc Bảo", birthYear: "1982", idCard: "001203xxxx", plate: "30A-12345", type: "Ô tô", room: "1808", fee: 1200000, slot: "B1-12", status: "USED" },
  { name: "Nguyễn Minh Anh", birthYear: "1985", idCard: "001201xxxx", plate: "29X1-22222", type: "Xe máy", room: "1201", fee: 70000, slot: "M-08", status: "USED" },
  { name: "Lê Hoài Nam", birthYear: "1980", idCard: "001204xxxx", plate: "38A-56789", type: "Ô tô", room: "2405", fee: 1500000, slot: "B2-09", status: "USED" },
];

export const initialUtilities = [
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

export const complaints = [
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

export const notifications = [
  { title: "Thông báo thu phí dịch vụ tháng 05/2026", scope: "Toàn chung cư", date: "27/05/2026", read: false },
  { title: "Bảo trì thang máy khu A", scope: "Theo tầng", date: "25/05/2026", read: true },
  { title: "Nhắc lịch họp cư dân", scope: "Toàn chung cư", date: "20/05/2026", read: true },
];

// Danh sách tài khoản hệ thống
export const users = [
  { username: "admin", password: "admin123", name: "Admin BlueMoon", role: "ADMIN" },
  { username: "admin2", password: "12345", name: "Admin Phó", role: "ADMIN" },
  { username: "resident1", password: "resident123", name: "Nguyễn Minh Anh", role: "RESIDENT" },
  { username: "resident2", password: "baolmuh", name: "Trần Quốc Bảo", role: "RESIDENT" },
  { username: "resident3", password: "hoainiem", name: "Lê Hoài Nam", role: "RESIDENT" },
];

export const initialRegistrations = [
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

export const initialFeeCatalog = [
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
