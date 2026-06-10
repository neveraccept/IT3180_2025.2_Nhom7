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

export function Profile({ user, setUser }) {
  const { users, setUsers } = useAppContext();
  const residentRoom = getResidentRoomByUser(user);
  const currentAccount = users.find((account) => account.username === user?.username) || {};
  const [formData, setFormData] = useState({
    fullName: currentAccount.fullName || currentAccount.name || user?.fullName || user?.name || "",
    email: currentAccount.email || user?.email || "",
    phone: currentAccount.phone || user?.phone || "",
    apartment: currentAccount.apartment || user?.apartment || residentRoom,
    oldPassword: "",
    newPassword: "",
    confirmNewPassword: "",
  });
  const [message, setMessage] = useState(null);

  const handleSave = () => {
    setMessage(null);

    if (!formData.fullName.trim() || !formData.email.trim() || !formData.phone.trim()) {
      setMessage({ tone: "red", text: "Vui lòng nhập đầy đủ họ tên, email và số điện thoại." });
      return;
    }

    if (formData.newPassword || formData.confirmNewPassword) {
      if (!formData.oldPassword.trim()) {
        setMessage({ tone: "red", text: "Vui lòng nhập mật khẩu cũ khi đổi mật khẩu." });
        return;
      }

      if (currentAccount.password && formData.oldPassword !== currentAccount.password) {
        setMessage({ tone: "red", text: "Mật khẩu cũ không đúng." });
        return;
      }

      if (formData.newPassword !== formData.confirmNewPassword) {
        setMessage({ tone: "red", text: "Mật khẩu mới nhập lại không khớp." });
        return;
      }
    }

    const updatedAccount = {
      ...currentAccount,
      username: user?.username,
      role: user?.role || currentAccount.role || "RESIDENT",
      fullName: formData.fullName.trim(),
      name: formData.fullName.trim(),
      email: formData.email.trim(),
      phone: formData.phone.trim(),
      apartment: residentRoom,
      active: currentAccount.active || "Hoạt động",
      password: formData.newPassword ? formData.newPassword : currentAccount.password,
    };

    setUsers((prev) => {
      const existed = prev.some((account) => account.username === user?.username);
      if (!existed) return [...prev, updatedAccount];
      return prev.map((account) => account.username === user?.username ? { ...account, ...updatedAccount } : account);
    });

    setUser?.((prev) => ({
      ...prev,
      fullName: updatedAccount.fullName,
      name: updatedAccount.name,
      email: updatedAccount.email,
      phone: updatedAccount.phone,
      apartment: residentRoom,
    }));

    setFormData({
      ...formData,
      oldPassword: "",
      newPassword: "",
      confirmNewPassword: "",
      apartment: residentRoom,
    });
    setMessage({ tone: "green", text: "Đã lưu thông tin cá nhân." });
  };

  return (
    <>
      <SectionHeader title="Thông tin cá nhân" desc="Cập nhật thông tin cá nhân và đổi mật khẩu tài khoản. Căn hộ không được phép thay đổi." />
      <Card className="max-w-3xl">
        <div className="grid gap-4 md:grid-cols-2">
          <Input label="Họ tên" value={formData.fullName} onChange={(e) => setFormData({ ...formData, fullName: e.target.value })} />
          <Input label="Email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
          <Input label="Số điện thoại" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} />
          <Input label="Căn hộ" value={residentRoom} disabled className="opacity-80" />
          <Input label="Mật khẩu cũ" type="password" value={formData.oldPassword} onChange={(e) => setFormData({ ...formData, oldPassword: e.target.value })} />
          <Input label="Mật khẩu mới" type="password" value={formData.newPassword} onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })} />
          <Input label="Nhập lại mật khẩu mới" type="password" value={formData.confirmNewPassword} onChange={(e) => setFormData({ ...formData, confirmNewPassword: e.target.value })} />
        </div>

        {message && (
          <div className={`mt-5 rounded-xl px-4 py-3 text-sm font-semibold ring-1 ${message.tone === "red" ? "bg-rose-50 text-rose-700 ring-rose-200" : "bg-emerald-50 text-emerald-700 ring-emerald-200"}`}>
            {message.text}
          </div>
        )}

        <div className="mt-5 flex justify-end"><Button onClick={handleSave}>Lưu thay đổi</Button></div>
      </Card>
    </>
  );
}
