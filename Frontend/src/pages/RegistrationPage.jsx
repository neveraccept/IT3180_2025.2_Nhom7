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

export function Registrations({ registrations, setRegistrations }) {
  const { addUser, users: accountUsers = [] } = useAppContext();
  const regs = registrations;
  const setRegs = setRegistrations;
  const [loading, setLoading] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);
  const [rejectReason, setRejectReason] = useState("");
  const [modalError, setModalError] = useState("");
  const [toast, setToast] = useState(null);

  const pendingRegs = regs.filter((r) => r.status === "pending");
  const selectedReg = confirmAction?.id ? regs.find((r) => r.id === confirmAction.id) : null;

  const showToast = (message, tone = "green") => {
    setToast({ message, tone });
    setTimeout(() => setToast(null), 3000);
  };

  const openApproveConfirm = (id) => {
    setConfirmAction({ type: "approve", id });
    setRejectReason("");
    setModalError("");
  };

  const openRejectConfirm = (id) => {
    setConfirmAction({ type: "reject", id });
    setRejectReason("");
    setModalError("");
  };

  const closeConfirm = () => {
    if (loading) return;
    setConfirmAction(null);
    setRejectReason("");
    setModalError("");
  };

  const confirmApprove = async () => {
    if (!selectedReg) return;

    if (selectedReg.status !== "pending") {
      setModalError("Yêu cầu này đã được xử lý rồi.");
      return;
    }

    setLoading(true);
    setModalError("");

    try {
      const existedAccount = accountUsers.some((u) => u.username === selectedReg.username);
      if (!existedAccount) {
        addUser({
          username: selectedReg.username,
          password: selectedReg.password || "",
          fullName: selectedReg.fullName,
          name: selectedReg.fullName,
          role: "RESIDENT",
          email: selectedReg.email,
          phone: selectedReg.phone,
          apartment: selectedReg.apartment,
          active: "Hoạt động",
        });
      }

      setRegs((prev) =>
        prev.map((r) =>
          r.id === selectedReg.id
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

      closeConfirm();
      showToast("Duyệt thành công! Tài khoản đã được thêm vào phần Tài khoản.", "green");
    } catch (err) {
      console.error("Approve error:", err);
      setModalError("Lỗi: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const confirmReject = () => {
    if (!selectedReg) return;

    if (!rejectReason.trim()) {
      setModalError("Vui lòng nhập lý do từ chối.");
      return;
    }

    if (selectedReg.status !== "pending") {
      setModalError("Yêu cầu này đã được xử lý rồi.");
      return;
    }

    setRegs((prev) =>
      prev.map((r) =>
        r.id === selectedReg.id
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

    closeConfirm();
    showToast("Đã từ chối yêu cầu đăng ký.", "red");
  };

  return (
    <>
      <SectionHeader title="Duyệt Đăng Ký Cư Dân" desc={`Có ${pendingRegs.length} yêu cầu chờ duyệt`} />

      {toast && (
        <div
          className={`mb-5 rounded-2xl px-4 py-3 text-sm font-semibold ring-1 ${
            toast.tone === "red"
              ? "bg-rose-50 text-rose-700 ring-rose-200"
              : "bg-emerald-50 text-emerald-700 ring-emerald-200"
          }`}
        >
          {toast.tone === "red" ? "✕ " : "✓ "}
          {toast.message}
        </div>
      )}

      {pendingRegs.length === 0 ? (
        <Card className="py-12 text-center">
          <div className="text-lg font-semibold text-slate-500">Không có yêu cầu đăng ký nào chờ duyệt</div>
        </Card>
      ) : (
        <div className="space-y-4">
          {pendingRegs.map((reg) => (
            <Card key={reg.id} className="border-l-4 border-l-amber-400">
              <div className="grid gap-4 md:grid-cols-[1fr_auto]">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-bold text-slate-900">{reg.fullName}</h3>
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
                    onClick={() => openApproveConfirm(reg.id)}
                    disabled={loading}
                  >
                    <CheckCircle2 className="h-4 w-4" /> Duyệt
                  </Button>
                  <Button
                    variant="danger"
                    onClick={() => openRejectConfirm(reg.id)}
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

      {regs.some((r) => r.status !== "pending") && (
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
          ]} rows={regs.filter((r) => r.status !== "pending")} />
        </>
      )}

      {confirmAction && selectedReg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 12 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl"
          >
            <div className="mb-5 flex items-start gap-4">
              <div
                className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${
                  confirmAction.type === "approve"
                    ? "bg-emerald-50 text-emerald-600"
                    : "bg-rose-50 text-rose-600"
                }`}
              >
                {confirmAction.type === "approve" ? (
                  <CheckCircle2 className="h-6 w-6" />
                ) : (
                  <AlertCircle className="h-6 w-6" />
                )}
              </div>
              <div>
                <h3 className="text-xl font-black text-slate-900">
                  {confirmAction.type === "approve" ? "Xác nhận duyệt đăng ký" : "Xác nhận từ chối đăng ký"}
                </h3>
                <p className="mt-1 text-sm leading-6 text-slate-500">
                  {confirmAction.type === "approve"
                    ? "Bạn có chắc chắn muốn duyệt yêu cầu này không?"
                    : "Bạn có chắc chắn muốn từ chối yêu cầu này không?"}
                </p>
              </div>
            </div>

            <div className="mb-5 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
              <div className="grid gap-2 md:grid-cols-2">
                <p><span className="font-semibold">Họ tên:</span> {selectedReg.fullName}</p>
                <p><span className="font-semibold">Username:</span> {selectedReg.username}</p>
                <p><span className="font-semibold">Căn hộ:</span> {selectedReg.apartment}</p>
                <p><span className="font-semibold">SĐT:</span> {selectedReg.phone}</p>
                <p className="md:col-span-2"><span className="font-semibold">Email:</span> {selectedReg.email}</p>
              </div>
            </div>

            {confirmAction.type === "reject" && (
              <label className="mb-4 block">
                <span className="mb-1.5 block text-sm font-semibold text-slate-700">Lý do từ chối</span>
                <textarea
                  rows={4}
                  value={rejectReason}
                  onChange={(e) => {
                    setRejectReason(e.target.value);
                    setModalError("");
                  }}
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
                  placeholder="Nhập lý do từ chối để lưu vào lịch sử..."
                />
              </label>
            )}

            {modalError && (
              <div className="mb-4 rounded-xl bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 ring-1 ring-rose-200">
                {modalError}
              </div>
            )}

            <div className="flex justify-end gap-3">
              <Button variant="secondary" onClick={closeConfirm} disabled={loading}>
                Hủy
              </Button>
              {confirmAction.type === "approve" ? (
                <Button onClick={confirmApprove} disabled={loading}>
                  {loading ? "Đang duyệt..." : "Xác nhận duyệt"}
                </Button>
              ) : (
                <Button variant="danger" onClick={confirmReject} disabled={loading}>
                  Xác nhận từ chối
                </Button>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </>
  );
}
