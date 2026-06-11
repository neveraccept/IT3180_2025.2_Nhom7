import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Search, Plus } from "lucide-react";
import { Badge, Button, Card, Input, Select } from "../components/common";
import { SectionHeader } from "../components/layout/SectionHeader";
import {
  listFeesAPI,
  searchFeesAPI,
  createFeeAPI,
  updateFeeAPI,
  deleteFeeAPI,
  listFeePeriodsAPI,
  createFeePeriodAPI,
  closeFeePeriodAPI,
} from "../api/feeApi";

// ============================================================
//  Module 4 — Quản lý khoản thu (Fee) + đợt thu (FeePeriod).
//  Nguồn dữ liệu: backend FeeController/FeePeriodController (ADMIN).
//  Mapping FeeDTO: { name, type(MANDATORY|DONATION), unitPrice, unit, description, active }.
//  (Backend không có "cách tính" hay "lịch sử chỉnh sửa" → đã lược bỏ.)
// ============================================================
// Đơn vị tính cho khoản thu BẮT BUỘC. Mã trùng với backend (Fee.unit).
const UNIT_OPTIONS = [
  { value: "PER_M2", label: "Theo m² (diện tích căn hộ)", suffix: "đ/m²" },
  { value: "PER_PERSON", label: "Theo số người", suffix: "đ/người" },
  { value: "PER_HOUSEHOLD", label: "Theo hộ gia đình", suffix: "đ/hộ" },
];
const unitSuffix = (unit) =>
  unit === "NONE" ? "" : UNIT_OPTIONS.find((u) => u.value === unit)?.suffix || unit || "";

export function Fees() {
  const emptyForm = {
    name: "",
    type: "MANDATORY",
    unitPrice: "",
    unit: "PER_M2",
    description: "",
    active: true,
  };

  const [fees, setFees] = useState([]);
  const [periods, setPeriods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState(emptyForm);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [filters, setFilters] = useState({ keyword: "", type: "ALL", active: "ALL" });
  const [activeKind, setActiveKind] = useState("MANDATORY");

  // ---- Đợt thu ----
  const emptyPeriodForm = { feeId: "", name: "", startDate: "", endDate: "" };
  const [showPeriodForm, setShowPeriodForm] = useState(false);
  const [periodForm, setPeriodForm] = useState(emptyPeriodForm);
  const [periodError, setPeriodError] = useState("");
  const [closeConfirm, setCloseConfirm] = useState(null);

  const activeKindConfig = activeKind === "DONATION"
    ? {
        title: "Đóng góp tự nguyện",
        createFee: "Tạo khoản đóng góp",
        periodTitle: "Đợt kêu gọi đóng góp",
        createPeriod: "Tạo đợt kêu gọi",
        periodNameLabel: "Tên đợt kêu gọi",
        periodPlaceholder: "VD: Đóng góp quỹ Trung thu 2026",
      }
    : {
        title: "Phí bắt buộc",
        createFee: "Tạo khoản phí",
        periodTitle: "Đợt thu phí",
        createPeriod: "Tạo đợt thu",
        periodNameLabel: "Tên đợt thu",
        periodPlaceholder: "VD: Phí quản lý tháng 6/2026",
      };
  const scopedFees = fees.filter((fee) => fee.type === activeKind);
  const scopedPeriods = periods.filter((period) => fees.find((fee) => fee.id === period.feeId)?.type === activeKind);
  const selectedPeriodFee = fees.find((fee) => String(fee.id) === String(periodForm.feeId));
  const selectedPeriodIsDonation = selectedPeriodFee?.type === "DONATION";
  const getTypeLabel = (type) => (type === "MANDATORY" ? "Bắt buộc" : "Đóng góp");
  const getTypeTone = (type) => (type === "MANDATORY" ? "red" : "violet");
  const getStatusLabel = (active) => (active ? "Đang dùng" : "Ngừng dùng");
  const getStatusTone = (active) => (active ? "green" : "gray");
  const formatUnitPrice = (fee) => {
    if (fee.type === "DONATION") return "Tự nguyện (cư dân tự nhập)";
    if (!fee.unitPrice || Number(fee.unitPrice) <= 0) return "—";
    return `${new Intl.NumberFormat("vi-VN").format(Number(fee.unitPrice))} ${unitSuffix(fee.unit)}`.trim();
  };
  const getPeriodStatusLabel = (status) => (status === "OPEN" ? "Đang mở" : "Đã đóng");
  const getPeriodStatusTone = (status) => (status === "OPEN" ? "green" : "gray");
  const formatDate = (value) => {
    if (!value) return "—";
    try {
      return new Date(value).toLocaleDateString("vi-VN");
    } catch {
      return value;
    }
  };
  const feeName = (feeId) => fees.find((f) => f.id === feeId)?.name || `#${feeId}`;

  // ---- Tải dữ liệu ----
  const loadFees = useCallback(async () => {
    const res = await searchFeesAPI({
      keyword: filters.keyword.trim() || undefined,
      type: filters.type !== "ALL" ? filters.type : undefined,
      active: filters.active !== "ALL" ? filters.active === "ACTIVE" : undefined,
    });
    if (res.success) setFees(res.data?.items || []);
    else setPageError(res.message || "Không tải được danh sách khoản thu");
  }, [filters]);

  const loadPeriods = useCallback(async () => {
    const res = await listFeePeriodsAPI();
    if (res.success) setPeriods(res.data?.items || []);
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setPageError("");
      const res = await listFeesAPI();
      if (res.success) setFees(res.data?.items || []);
      else setPageError(res.message || "Không tải được danh sách khoản thu");
      await loadPeriods();
      setLoading(false);
    })();
  }, [loadPeriods]);

  const handleSearch = () => loadFees();
  const handleResetFilters = async () => {
    setFilters({ keyword: "", type: activeKind, active: "ALL" });
    const res = await listFeesAPI();
    if (res.success) setFees(res.data?.items || []);
  };

  const openCreateForm = () => {
    setFormData({
      ...emptyForm,
      type: activeKind,
      unitPrice: activeKind === "DONATION" ? "" : emptyForm.unitPrice,
      unit: activeKind === "DONATION" ? "NONE" : emptyForm.unit,
    });
    setEditingId(null);
    setError("");
    setShowForm(true);
  };

  const openDetail = (fee) => {
    setEditingId(fee.id);
    setFormData({
      name: fee.name || "",
      type: fee.type || "MANDATORY",
      unitPrice: fee.unitPrice != null ? String(fee.unitPrice) : "",
      unit: fee.unit || "",
      description: fee.description || "",
      active: fee.active !== false,
    });
    setError("");
    setShowForm(true);
  };

  const handleSave = async () => {
    const name = formData.name.trim();
    if (!name) {
      setError("Vui lòng nhập tên khoản thu");
      return;
    }
    const unitPrice = Number(formData.unitPrice || 0);
    if (formData.type === "MANDATORY" && unitPrice <= 0) {
      setError("Khoản thu bắt buộc phải có đơn giá lớn hơn 0");
      return;
    }

    const payload = {
      name,
      type: formData.type,
      // Tự nguyện: đơn vị NONE + không đơn giá; cư dân tự nhập số tiền khi thanh toán.
      unitPrice: formData.type === "DONATION" ? 0 : unitPrice,
      unit: formData.type === "DONATION" ? "NONE" : formData.unit,
      description: formData.description.trim(),
      active: !!formData.active,
    };

    setSaving(true);
    setError("");
    const res = editingId ? await updateFeeAPI(editingId, payload) : await createFeeAPI(payload);
    setSaving(false);
    if (!res.success) {
      setError(res.message || "Lưu khoản thu thất bại");
      return;
    }
    setShowForm(false);
    setEditingId(null);
    setFormData(emptyForm);
    await loadFees();
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    const res = await deleteFeeAPI(deleteConfirm.id);
    setDeleteConfirm(null);
    if (!res.success) {
      setPageError(res.message || "Xoá khoản thu thất bại");
      return;
    }
    setShowForm(false);
    setEditingId(null);
    await loadFees();
  };

  // ---- Đợt thu ----
  const openPeriodForm = () => {
    setPeriodForm({ ...emptyPeriodForm, feeId: scopedFees[0]?.id ? String(scopedFees[0].id) : "" });
    setPeriodError("");
    setShowPeriodForm(true);
  };

  const handleSavePeriod = async () => {
    if (!periodForm.feeId) {
      setPeriodError("Vui lòng chọn khoản thu");
      return;
    }
    if (!periodForm.name.trim()) {
      setPeriodError("Vui lòng nhập tên đợt thu");
      return;
    }
    if (!periodForm.startDate || !periodForm.endDate) {
      setPeriodError("Vui lòng chọn ngày bắt đầu và kết thúc");
      return;
    }
    if (periodForm.endDate < periodForm.startDate) {
      setPeriodError("Ngày kết thúc phải sau ngày bắt đầu");
      return;
    }
    const res = await createFeePeriodAPI({
      feeId: Number(periodForm.feeId),
      name: periodForm.name.trim(),
      startDate: periodForm.startDate,
      endDate: periodForm.endDate,
    });
    if (!res.success) {
      setPeriodError(res.message || "Tạo đợt thu thất bại");
      return;
    }
    setShowPeriodForm(false);
    await loadPeriods();
  };

  const handleClosePeriod = async () => {
    if (!closeConfirm) return;
    const res = await closeFeePeriodAPI(closeConfirm.id);
    setCloseConfirm(null);
    if (!res.success) {
      setPageError(res.message || "Đóng đợt thu thất bại");
      return;
    }
    await loadPeriods();
  };

  return (
    <>
      <SectionHeader
        title="Quản lý khoản thu"
        action={<Button onClick={openCreateForm}><Plus className="h-4 w-4" /> {activeKindConfig.createFee}</Button>}
      />

      {pageError && (
        <div className="mb-5 rounded-xl bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 ring-1 ring-rose-200">{pageError}</div>
      )}

      <Card className="mb-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h3 className="text-lg font-black text-slate-900">{activeKindConfig.title}</h3>
          </div>
          <div className="inline-flex rounded-xl bg-slate-100 p-1 ring-1 ring-slate-200">
            {[
              { key: "MANDATORY", label: "Phí bắt buộc" },
              { key: "DONATION", label: "Đóng góp" },
            ].map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => {
                  setActiveKind(item.key);
                  setFilters((prev) => ({ ...prev, type: item.key }));
                  setShowForm(false);
                  setShowPeriodForm(false);
                }}
                className={`rounded-lg px-4 py-2 text-sm font-bold transition ${
                  activeKind === item.key
                    ? "bg-white text-sky-700 shadow-sm ring-1 ring-sky-100"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </Card>

      <Card className="mb-5">
        <div className="grid gap-4 md:grid-cols-2">
          <Input
            label="Tìm theo tên khoản thu"
            placeholder="VD: phí quản lý"
            value={filters.keyword}
            onChange={(e) => setFilters({ ...filters, keyword: e.target.value })}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          />
          <Select label="Trạng thái" value={filters.active} onChange={(e) => setFilters({ ...filters, active: e.target.value })}>
            <option value="ALL">Tất cả</option>
            <option value="ACTIVE">Đang dùng</option>
            <option value="INACTIVE">Ngừng dùng</option>
          </Select>
        </div>
        <div className="mt-4 flex gap-3">
          <Button onClick={handleSearch}><Search className="h-4 w-4" /> Tìm kiếm</Button>
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
                <th className="px-5 py-4">Đơn giá</th>
                <th className="px-5 py-4">Mô tả</th>
                <th className="px-5 py-4">Trạng thái</th>
                <th className="px-5 py-4 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading && (
                <tr><td colSpan={6} className="px-5 py-10 text-center text-sm font-semibold text-slate-500">Đang tải dữ liệu…</td></tr>
              )}
              {!loading && scopedFees.length === 0 && (
                <tr><td colSpan={6} className="px-5 py-10 text-center text-sm font-semibold text-slate-500">Chưa có khoản thu nào.</td></tr>
              )}
              {!loading && scopedFees.map((fee) => (
                <tr key={fee.id} className="hover:bg-slate-50/80">
                  <td className="px-5 py-4 font-semibold text-slate-800">{fee.name}</td>
                  <td className="px-5 py-4"><Badge tone={getTypeTone(fee.type)}>{getTypeLabel(fee.type)}</Badge></td>
                  <td className="px-5 py-4 text-slate-700">{formatUnitPrice(fee)}</td>
                  <td className="px-5 py-4 text-slate-600">{fee.description || "—"}</td>
                  <td className="px-5 py-4"><Badge tone={getStatusTone(fee.active)}>{getStatusLabel(fee.active)}</Badge></td>
                  <td className="px-5 py-4 text-right">
                    <button onClick={() => openDetail(fee)} className="font-semibold text-sky-700 hover:text-sky-900">Chi tiết</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ===================== ĐỢT THU ===================== */}
      <div className="mt-8">
        <SectionHeader
          title={activeKindConfig.periodTitle}
          action={<Button onClick={openPeriodForm} disabled={scopedFees.length === 0}><Plus className="h-4 w-4" /> {activeKindConfig.createPeriod}</Button>}
        />
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-5 py-4">Tên đợt thu</th>
                  <th className="px-5 py-4">Khoản thu</th>
                  <th className="px-5 py-4">Từ ngày</th>
                  <th className="px-5 py-4">Đến ngày</th>
                  <th className="px-5 py-4">Trạng thái</th>
                  <th className="px-5 py-4 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {scopedPeriods.length === 0 && (
                  <tr><td colSpan={6} className="px-5 py-10 text-center text-sm font-semibold text-slate-500">Chưa có đợt thu nào.</td></tr>
                )}
                {scopedPeriods.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/80">
                    <td className="px-5 py-4 font-semibold text-slate-800">{p.name}</td>
                    <td className="px-5 py-4 text-slate-700">{feeName(p.feeId)}</td>
                    <td className="px-5 py-4 text-slate-700">{formatDate(p.startDate)}</td>
                    <td className="px-5 py-4 text-slate-700">{formatDate(p.endDate)}</td>
                    <td className="px-5 py-4"><Badge tone={getPeriodStatusTone(p.status)}>{getPeriodStatusLabel(p.status)}</Badge></td>
                    <td className="px-5 py-4 text-right">
                      {p.status === "OPEN" ? (
                          <button onClick={() => setCloseConfirm(p)} className="font-semibold text-rose-700 hover:text-rose-900">Đóng đợt</button>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ===================== MODAL KHOẢN THU ===================== */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white p-6 shadow-xl">
            <h3 className="mb-4 text-lg font-black">
              {editingId ? "Chi tiết khoản thu" : activeKind === "DONATION" ? "Tạo khoản đóng góp" : "Tạo khoản phí"}
            </h3>
            <div className="space-y-4">
              <Input
                label={formData.type === "DONATION" ? "Tên khoản đóng góp" : "Tên khoản phí"}
                placeholder={formData.type === "DONATION" ? "VD: Quỹ Trung thu" : "VD: Phí quản lý chung cư"}
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
              <div className="grid gap-4 md:grid-cols-2">
                <Input label="Loại" value={formData.type === "DONATION" ? "Đóng góp tự nguyện" : "Phí bắt buộc"} disabled />
                <Select label="Trạng thái" value={formData.active ? "ACTIVE" : "INACTIVE"} onChange={(e) => setFormData({ ...formData, active: e.target.value === "ACTIVE" })}>
                  <option value="ACTIVE">Đang dùng</option>
                  <option value="INACTIVE">Ngừng dùng</option>
                </Select>
              </div>
              {formData.type === "DONATION" ? (
                <div className="grid gap-4 md:grid-cols-2">
                  <Input label="Đơn giá" value="" placeholder="Không áp dụng" disabled />
                  <Input label="Đơn vị tính" value="VND" disabled />
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  <Input label="Đơn giá" placeholder="VD: 7000" type="number" value={formData.unitPrice} onChange={(e) => setFormData({ ...formData, unitPrice: e.target.value })} />
                  <Select label="Đơn vị tính" value={formData.unit} onChange={(e) => setFormData({ ...formData, unit: e.target.value })}>
                    {UNIT_OPTIONS.map((u) => (
                      <option key={u.value} value={u.value}>{u.label}</option>
                    ))}
                  </Select>
                </div>
              )}
              <label className="block">
                <span className="mb-1.5 block text-sm font-semibold text-slate-700">{formData.type === "DONATION" ? "Mục đích đóng góp" : "Mô tả"}</span>
                <textarea
                  rows={4}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
                  placeholder={formData.type === "DONATION" ? "VD: Tổ chức chương trình Trung thu cho cư dân nhí..." : "Nhập mô tả khoản thu..."}
                />
              </label>

              {error && <div className="rounded-xl bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 ring-1 ring-rose-200">{error}</div>}

              <div className="flex flex-col gap-3 pt-2 md:flex-row md:items-center md:justify-between">
                <div className="flex flex-wrap gap-3">
                  <Button variant="secondary" onClick={() => { setShowForm(false); setEditingId(null); setError(""); }}>Hủy</Button>
                  {editingId && (
                    <Button variant="danger" onClick={() => setDeleteConfirm({ id: editingId, name: formData.name })}>Xóa</Button>
                  )}
                </div>
                <Button onClick={handleSave} disabled={saving}>{saving ? "Đang lưu…" : "Lưu"}</Button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {deleteConfirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
          <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-xl">
            <h3 className="mb-3 text-lg font-black">Xóa khoản thu</h3>
            <p className="mb-5 text-sm text-slate-600">Bạn có chắc muốn xóa <strong>{deleteConfirm.name}</strong>?</p>
            <div className="flex justify-end gap-3">
              <Button variant="secondary" onClick={() => setDeleteConfirm(null)}>Hủy</Button>
              <Button variant="danger" onClick={handleDelete}>Xóa</Button>
            </div>
          </motion.div>
        </div>
      )}

      {/* ===================== MODAL ĐỢT THU ===================== */}
      {showPeriodForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl bg-white p-6 shadow-xl">
            <h3 className="mb-4 text-lg font-black">{activeKindConfig.createPeriod}</h3>
            <div className="space-y-4">
              <Select label={activeKind === "DONATION" ? "Khoản đóng góp" : "Khoản phí"} value={periodForm.feeId} onChange={(e) => setPeriodForm({ ...periodForm, feeId: e.target.value })}>
                {scopedFees.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
              </Select>
              <Input label={activeKindConfig.periodNameLabel} placeholder={activeKindConfig.periodPlaceholder} value={periodForm.name} onChange={(e) => setPeriodForm({ ...periodForm, name: e.target.value })} />
              <div className="grid gap-4 md:grid-cols-2">
                <Input label="Từ ngày" type="date" value={periodForm.startDate} onChange={(e) => setPeriodForm({ ...periodForm, startDate: e.target.value })} />
                <Input label="Đến ngày" type="date" value={periodForm.endDate} onChange={(e) => setPeriodForm({ ...periodForm, endDate: e.target.value })} />
              </div>
              <p className="rounded-xl bg-sky-50 px-4 py-3 text-xs font-medium text-sky-700 ring-1 ring-sky-200">
                {selectedPeriodIsDonation
                  ? "Khi lưu, hệ thống mở đợt đóng góp cho các hộ đang hoạt động. Khoản này không tính vào công nợ và chỉ ghi nhận số tiền cư dân thực đóng."
                  : "Khi lưu, hệ thống sẽ tự phát hành phiếu thu cho tất cả các hộ đang hoạt động, số tiền tính theo đơn giá hiện hành của khoản phí."}
              </p>
              {periodError && <div className="rounded-xl bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 ring-1 ring-rose-200">{periodError}</div>}
              <div className="flex justify-end gap-3 pt-2">
                <Button variant="secondary" onClick={() => setShowPeriodForm(false)}>Hủy</Button>
                <Button onClick={handleSavePeriod}>Lưu</Button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {closeConfirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
          <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-xl">
            <h3 className="mb-3 text-lg font-black">Đóng đợt thu</h3>
            <p className="mb-5 text-sm text-slate-600">Bạn có chắc muốn đóng đợt thu <strong>{closeConfirm.name}</strong>? Sau khi đóng sẽ không thể mở lại.</p>
            <div className="flex justify-end gap-3">
              <Button variant="secondary" onClick={() => setCloseConfirm(null)}>Hủy</Button>
              <Button variant="danger" onClick={handleClosePeriod}>Đóng đợt</Button>
            </div>
          </motion.div>
        </div>
      )}
    </>
  );
}
