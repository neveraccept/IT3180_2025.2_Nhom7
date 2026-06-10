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
  History,
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
  { key: "auditLogs", label: "Lịch sử hệ thống", icon: History },
];

export const residentNav = [
  { key: "dashboard", label: "Dashboard", icon: Home },
  { key: "myFees", label: "Khoản phí của tôi", icon: WalletCards },
  { key: "vehicles", label: "Gửi xe", icon: Car },
  { key: "complaints", label: "Khiếu nại của tôi", icon: MessageSquareWarning },
  { key: "notifications", label: "Thông báo", icon: Bell },
  { key: "profile", label: "Thông tin cá nhân", icon: KeyRound },
];
