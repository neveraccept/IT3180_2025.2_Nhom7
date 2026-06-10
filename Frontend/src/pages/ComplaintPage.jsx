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

export function Complaints({ role, user, complaintsList, setComplaintsList, initialComplaintId, onInitialComplaintHandled }) {
  const residentRoom = getResidentRoomByUser(user);
  const visibleComplaints = role === "ADMIN"
    ? complaintsList
    : complaintsList.filter((complaint) => String(complaint.sender || "").trim() === `Căn ${residentRoom}`);
  const [selectedComplaint, setSelectedComplaint] = useState(() =>
    initialComplaintId ? visibleComplaints.find((item) => item.id === initialComplaintId) || null : null
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
    if (role !== "ADMIN") return;

    if (handlingStatus === "RESOLVED" && !handlingContent.trim()) {
      setError("Khi chuyển sang Đã giải quyết, vui lòng nhập nội dung xử lý");
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
      sender: `Căn ${residentRoom}`,
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
            : `Cư dân căn ${residentRoom} chỉ xem và gửi khiếu nại của chính căn hộ mình.`
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
              {visibleComplaints.map((complaint) => (
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
              {visibleComplaints.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-5 py-10 text-center text-sm font-semibold text-slate-500">
                    Chưa có khiếu nại nào của căn hộ này.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selectedComplaint && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <h3 className="text-xl font-black text-slate-900">Chi tiết khiếu nại</h3>
                <p className="mt-1 text-sm text-slate-500">{selectedComplaint.id} • {selectedComplaint.sender}</p>
              </div>
              <StatusBadge status={selectedComplaint.status} />
            </div>

            <div className="mb-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-700">
              <p><strong>Tiêu đề:</strong> {selectedComplaint.title}</p>
              <p><strong>Loại:</strong> {selectedComplaint.category}</p>
              <p className="mt-2"><strong>Nội dung khiếu nại:</strong></p>
              <p>{selectedComplaint.content}</p>
            </div>

            {role === "ADMIN" ? (
              <div className="space-y-4">
                <label className="block">
                  <span className="mb-1.5 block text-sm font-semibold text-slate-700">Nội dung xử lý</span>
                  <textarea
                    rows={5}
                    value={handlingContent}
                    onChange={(e) => setHandlingContent(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
                    placeholder={handlingStatus === "IN_PROGRESS" ? "Có thể bỏ trống khi trạng thái là Đang xử lý" : "Nhập nội dung xử lý khi đã giải quyết..."}
                  />
                </label>
                <Select label="Trạng thái" value={handlingStatus} onChange={(e) => setHandlingStatus(e.target.value)}>
                  <option value="IN_PROGRESS">Đang xử lý</option>
                  <option value="RESOLVED">Đã giải quyết</option>
                </Select>
                {error && <div className="rounded-xl bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 ring-1 ring-rose-200">{error}</div>}
                <div className="flex justify-end gap-3">
                  <Button variant="secondary" onClick={closeDetail}>Hủy</Button>
                  <Button onClick={handleSave}>Lưu</Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-700">
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Nội dung xử lý của Ban quản trị</p>
                  <p className="mt-2">{selectedComplaint.response || "Ban quản trị chưa cập nhật nội dung xử lý."}</p>
                </div>
                <div className="flex justify-end">
                  <Button variant="secondary" onClick={closeDetail}>Đóng</Button>
                </div>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </>
  );
}
