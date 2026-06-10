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

export function Fees({ feesList, setFeesList, syncPaymentsForMandatoryFee, removePaymentsForFee }) {
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
