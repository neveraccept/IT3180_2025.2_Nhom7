import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Search, Plus, AlertCircle, CheckCheck, X, Receipt, Upload, FileSpreadsheet, Download } from "lucide-react";
import { money } from "../utils/helpers";
import { Button, Card, Input, Select, StatusBadge, Pagination } from "../components/common";
import { SectionHeader } from "../components/layout/SectionHeader";
import {
  searchUtilityBillsAPI,
  createUtilityBillAPI,
  updateUtilityBillAPI,
  deleteUtilityBillAPI,
  confirmCashUtilityBillAPI,
  confirmCashUtilityBillsBatchAPI,
  importUtilityBillsExcelAPI,
  downloadUtilityImportTemplateAPI,
  generateUtilityFeesAPI,
} from "../api/utilityApi";
import { downloadBlob } from "../api/reportApi";
import { listSystemConfigsAPI, updateSystemConfigAPI, CONFIG_KEYS } from "../api/systemConfigApi";
import { getApartmentDetailAPI, listApartmentsAPI } from "../api/apartmentApi";

// ============================================================
//  Module 7 — Quản lý hóa đơn điện/nước/internet (ADMIN).
//  Nguồn dữ liệu: backend UtilityBillController + SystemConfigController.
//  - Điện/Nước: nhập chỉ số cũ/mới, backend tự tính tiền theo đơn giá trong SystemConfig.
//  - Internet: lấy giá gói trong SystemConfig (có thể nhập tay để ghi đè).
//  - Đơn giá gốc được quản lý ở card "Đơn giá hệ thống".
// ============================================================
export function Utilities() {
  const utilityTypes = [
    { value: "ELECTRICITY", label: "Điện" },
    { value: "WATER", label: "Nước" },
    { value: "INTERNET", label: "Internet" },
  ];
  const months = Array.from({ length: 12 }, (_, index) => index + 1);
  const years = [2024, 2025, 2026, 2027, 2028];

  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState("");

  // Phân trang phía server: 20 hóa đơn/trang.
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const PAGE_SIZE = 20;

  const [showForm, setShowForm] = useState(false);
  const [editingBill, setEditingBill] = useState(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  // Thao tác hàng loạt: tập id hóa đơn (UNPAID) đang được tick chọn.
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [bulkConfirm, setBulkConfirm] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [toast, setToast] = useState(null);

  // Sinh hóa đơn phí điện nước theo tháng (giống "Tạo hóa đơn phí gửi xe").
  const [showFeeForm, setShowFeeForm] = useState(false);
  const [feeForm, setFeeForm] = useState({ month: new Date().getMonth() + 1, year: new Date().getFullYear() });
  const [feeError, setFeeError] = useState("");
  const [feeSaving, setFeeSaving] = useState(false);

  // Nhập hàng loạt từ Excel.
  const [showImport, setShowImport] = useState(false);
  const [importFile, setImportFile] = useState(null);
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState("");
  const [importResult, setImportResult] = useState(null);

  const [searchFilters, setSearchFilters] = useState({ householdId: "", type: "", month: "", year: "", status: "" });
  const emptyForm = { apartmentId: "", householdId: "", type: "ELECTRICITY", month: new Date().getMonth() + 1, year: new Date().getFullYear(), oldIndex: "", newIndex: "", amount: "" };
  const [formData, setFormData] = useState(emptyForm);
  const [apartmentOptions, setApartmentOptions] = useState([]);
  const [loadingApartments, setLoadingApartments] = useState(false);

  // Đơn giá hệ thống (điện/nước/internet)
  const [configs, setConfigs] = useState([]);
  const [configDraft, setConfigDraft] = useState({});
  const [configSaving, setConfigSaving] = useState("");
  const [configMsg, setConfigMsg] = useState("");

  const getUtilityLabel = (type) => utilityTypes.find((item) => item.value === type)?.label || type;
  const isMetered = (type) => type === "ELECTRICITY" || type === "WATER";
  const configValue = (key) => Number(configs.find((c) => c.configKey === key)?.configValue || 0);
  const utilityConfigKeys = [
    CONFIG_KEYS.ELECTRICITY_UNIT_PRICE,
    CONFIG_KEYS.WATER_UNIT_PRICE,
    CONFIG_KEYS.INTERNET_PRICE,
  ];

  const configLabel = (key) =>
    ({
      [CONFIG_KEYS.ELECTRICITY_UNIT_PRICE]: "Đơn giá điện (đ/số)",
      [CONFIG_KEYS.WATER_UNIT_PRICE]: "Đơn giá nước (đ/khối)",
      [CONFIG_KEYS.INTERNET_PRICE]: "Giá internet (đ/tháng)",
    }[key] || key);

  const loadConfigs = useCallback(async () => {
    const res = await listSystemConfigsAPI();
    if (res.success) {
      const list = res.data || [];
      setConfigs(list);
      setConfigDraft(Object.fromEntries(list.map((c) => [c.configKey, String(c.configValue ?? "")])));
    }
  }, []);

  const loadApartmentOptions = useCallback(async () => {
    setLoadingApartments(true);
    const res = await listApartmentsAPI({ page: 0, size: 1000, sort: "code,asc" });
    setLoadingApartments(false);
    if (res.success) {
      setApartmentOptions((res.data?.items || []).filter((apartment) => apartment.currentHouseholdCode));
    }
  }, []);

  const handleSaveConfig = async (key) => {
    const value = Number(configDraft[key]);
    if (!(value >= 0)) {
      setConfigMsg("Đơn giá không hợp lệ");
      return;
    }
    setConfigSaving(key);
    setConfigMsg("");
    const res = await updateSystemConfigAPI(key, value);
    setConfigSaving("");
    if (!res.success) {
      setConfigMsg(res.message || "Cập nhật đơn giá thất bại");
      return;
    }
    setConfigMsg("Đã cập nhật đơn giá. Áp dụng cho các hóa đơn tạo mới.");
    await loadConfigs();
  };

  const showToast = (message, tone = "green") => {
    setToast({ message, tone });
    setTimeout(() => setToast(null), 3000);
  };

  const loadBills = useCallback(async (targetPage = 1) => {
    setLoading(true);
    setPageError("");
    setSelectedIds(new Set());
    const res = await searchUtilityBillsAPI({
      householdId: searchFilters.householdId || undefined,
      type: searchFilters.type || undefined,
      month: searchFilters.month || undefined,
      year: searchFilters.year || undefined,
      status: searchFilters.status || undefined,
      page: targetPage - 1,
      size: PAGE_SIZE,
    });
    if (res.success) {
      setBills(res.data?.items || []);
      setTotal(res.data?.totalElements || 0);
      setPage(targetPage);
    } else {
      setPageError(res.message || "Không tải được danh sách hóa đơn");
    }
    setLoading(false);
  }, [searchFilters]);

  useEffect(() => {
    loadBills(1);
    loadConfigs();
    loadApartmentOptions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSearch = () => loadBills(1);
  const handleResetSearch = () => {
    setSearchFilters({ householdId: "", type: "", month: "", year: "", status: "" });
    setTimeout(() => loadBills(1), 0);
  };

  const openCreateForm = () => {
    setFormData(emptyForm);
    setEditingBill(null);
    setError("");
    setShowForm(true);
  };

  const handleEdit = (bill) => {
    setFormData({
      apartmentId: "",
      householdId: String(bill.householdId ?? ""),
      type: bill.type,
      month: bill.month,
      year: bill.year,
      oldIndex: bill.oldIndex != null ? String(bill.oldIndex) : "",
      newIndex: bill.newIndex != null ? String(bill.newIndex) : "",
      amount: bill.amount != null ? String(bill.amount) : "",
    });
    setEditingBill(bill);
    setError("");
    setShowForm(true);
  };

  const handleApartmentChange = async (apartmentId) => {
    setFormData((prev) => ({ ...prev, apartmentId, householdId: "" }));
    setError("");
    if (!apartmentId) return;

    const res = await getApartmentDetailAPI(apartmentId);
    const householdId = res.data?.currentHousehold?.id;
    if (!res.success || !householdId) {
      setError(res.message || "Căn hộ này chưa có hộ dân đang ở");
      return;
    }
    setFormData((prev) => ({ ...prev, apartmentId, householdId: String(householdId) }));
  };

  const handleSave = async () => {
    if (!editingBill && !String(formData.householdId).trim()) {
      setError("Vui lòng chọn căn hộ");
      return;
    }

    const metered = isMetered(formData.type);
    const oldIndex = formData.oldIndex === "" ? null : Number(formData.oldIndex);
    const newIndex = formData.newIndex === "" ? null : Number(formData.newIndex);
    const amount = formData.amount === "" ? null : Number(formData.amount);

    if (metered) {
      // Điện/nước: cần chỉ số; số tiền do backend tự tính.
      if (oldIndex == null || newIndex == null) {
        setError("Vui lòng nhập chỉ số cũ và chỉ số mới");
        return;
      }
      if (newIndex < oldIndex) {
        setError("Chỉ số mới phải lớn hơn hoặc bằng chỉ số cũ");
        return;
      }
    } else if (amount != null && amount <= 0) {
      // Internet: nhập tay thì phải > 0; bỏ trống sẽ lấy giá gói trong cấu hình.
      setError("Số tiền phải lớn hơn 0");
      return;
    }

    setSaving(true);
    setError("");
    // Điện/nước gửi chỉ số (amount để backend tính); internet gửi amount (có thể null).
    const payload = metered
      ? { type: formData.type, month: Number(formData.month), year: Number(formData.year), oldIndex, newIndex }
      : { type: formData.type, month: Number(formData.month), year: Number(formData.year), amount };

    let res;
    if (editingBill) {
      // Backend chỉ cho sửa khi UNPAID.
      res = await updateUtilityBillAPI(editingBill.id, payload);
    } else {
      res = await createUtilityBillAPI({ householdId: Number(formData.householdId), ...payload });
    }
    setSaving(false);
    if (!res.success) {
      setError(res.message || "Lưu hóa đơn thất bại");
      return;
    }
    setShowForm(false);
    setEditingBill(null);
    await loadBills(page);
  };

  const handleConfirmCash = async () => {
    if (!editingBill) return;
    const res = await confirmCashUtilityBillAPI(editingBill.id);
    if (!res.success) {
      setError(res.message || "Ghi nhận nộp tiền mặt thất bại");
      return;
    }
    setShowForm(false);
    setEditingBill(null);
    await loadBills(page);
  };

  // ----- Lựa chọn hàng loạt (chỉ hóa đơn chưa nộp) -----
  const selectableIds = bills.filter((b) => b.status !== "PAID").map((b) => b.id);
  const allSelected = selectableIds.length > 0 && selectableIds.every((id) => selectedIds.has(id));

  const toggleRow = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    setSelectedIds((prev) => {
      if (selectableIds.every((id) => prev.has(id))) return new Set();
      return new Set(selectableIds);
    });
  };

  const handleBulkConfirm = async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    setConfirming(true);
    const res = await confirmCashUtilityBillsBatchAPI(ids);
    setConfirming(false);
    setBulkConfirm(false);
    if (res.failed > 0) {
      showToast(`Đã xác nhận ${res.ok}/${ids.length} hóa đơn. ${res.failed} hóa đơn lỗi.`, res.ok > 0 ? "green" : "red");
    } else {
      showToast(`Đã xác nhận tiền mặt cho ${res.ok} hóa đơn`);
    }
    await loadBills(page);
  };

  const handleConfirmDelete = async () => {
    if (!deleteConfirm) return;
    const res = await deleteUtilityBillAPI(deleteConfirm.id);
    setDeleteConfirm(null);
    if (!res.success) {
      setPageError(res.message || "Xoá hóa đơn thất bại");
      return;
    }
    setShowForm(false);
    setEditingBill(null);
    await loadBills(page);
  };

  // ----- Sinh hóa đơn phí điện nước theo tháng (gắn vào hệ thống Thu phí) -----
  const handleGenerateFees = async () => {
    setFeeError("");
    setFeeSaving(true);
    const res = await generateUtilityFeesAPI({ month: feeForm.month, year: feeForm.year });
    setFeeSaving(false);
    if (!res.success) {
      setFeeError(res.message || "Tạo hóa đơn phí điện nước thất bại");
      return;
    }
    setShowFeeForm(false);
    showToast(`Đã tạo ${res.data?.invoiceCount ?? 0} hóa đơn phí điện nước (xem ở mục Thu phí)`);
  };

  // ----- Nhập hàng loạt từ Excel -----
  const openImport = () => {
    setImportFile(null);
    setImportError("");
    setImportResult(null);
    setShowImport(true);
  };

  const handleDownloadTemplate = async () => {
    const res = await downloadUtilityImportTemplateAPI();
    if (!res.success || !res.data) {
      showToast(res.message || "Không tải được file mẫu", "red");
      return;
    }
    downloadBlob(res.data, "mau-hoa-don-dien-nuoc.xlsx");
  };

  const handleImport = async () => {
    if (!importFile) {
      setImportError("Vui lòng chọn file Excel (.xlsx)");
      return;
    }
    setImporting(true);
    setImportError("");
    setImportResult(null);
    const res = await importUtilityBillsExcelAPI(importFile);
    setImporting(false);
    if (!res.success) {
      setImportError(res.message || "Nhập hóa đơn thất bại");
      return;
    }
    setImportResult(res.data);
    showToast(`Đã nhập ${res.data?.createdCount ?? 0} hóa đơn`
      + ((res.data?.skippedCount ?? 0) > 0 ? `, bỏ qua ${res.data.skippedCount} dòng (không có hộ)` : "")
      + ((res.data?.failedCount ?? 0) > 0 ? `, ${res.data.failedCount} dòng lỗi` : ""));
    await loadBills(1);
  };

  // Tạm tính số tiền điện/nước = (chỉ số mới - chỉ số cũ) * đơn giá hiện hành.
  const meteredPreview = (() => {
    if (!isMetered(formData.type)) return null;
    const o = Number(formData.oldIndex);
    const n = Number(formData.newIndex);
    if (formData.oldIndex === "" || formData.newIndex === "" || Number.isNaN(o) || Number.isNaN(n) || n < o) return null;
    const price = configValue(formData.type === "ELECTRICITY" ? CONFIG_KEYS.ELECTRICITY_UNIT_PRICE : CONFIG_KEYS.WATER_UNIT_PRICE);
    return (n - o) * price;
  })();

  return (
    <>
      <SectionHeader
        title="Quản lý phí điện, nước, internet"
        action={
          <div className="flex flex-wrap gap-3">
            <Button variant="secondary" onClick={() => { setFeeError(""); setShowFeeForm(true); }}>
              <Receipt className="h-4 w-4" /> Tạo hóa đơn điện nước
            </Button>
            <Button variant="secondary" onClick={openImport}>
              <Upload className="h-4 w-4" /> Nhập từ Excel
            </Button>
            <Button onClick={openCreateForm}><Plus className="h-4 w-4" /> Nhập hóa đơn</Button>
          </div>
        }
      />

      {toast && (
        <div className={`mb-5 rounded-2xl px-4 py-3 text-sm font-semibold ring-1 ${toast.tone === "red" ? "bg-rose-50 text-rose-700 ring-rose-200" : "bg-emerald-50 text-emerald-700 ring-emerald-200"}`}>{toast.message}</div>
      )}

      {pageError && (
        <div className="mb-5 rounded-xl bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 ring-1 ring-rose-200">{pageError}</div>
      )}

      <Card className="mb-5">
        <div className="grid gap-4 md:grid-cols-5">
          <Input
            label="Mã hộ (householdId)"
            placeholder="VD: 1"
            value={searchFilters.householdId}
            onChange={(e) => setSearchFilters({ ...searchFilters, householdId: e.target.value })}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          />
          <Select label="Loại hóa đơn" value={searchFilters.type} onChange={(e) => setSearchFilters({ ...searchFilters, type: e.target.value })}>
            <option value="">Tất cả</option>
            <option value="ELECTRICITY">Điện</option>
            <option value="WATER">Nước</option>
            <option value="INTERNET">Internet</option>
          </Select>
          <Select label="Tháng" value={searchFilters.month} onChange={(e) => setSearchFilters({ ...searchFilters, month: e.target.value })}>
            <option value="">Tất cả</option>
            {months.map((month) => <option key={month} value={month}>Tháng {month}</option>)}
          </Select>
          <Select label="Năm" value={searchFilters.year} onChange={(e) => setSearchFilters({ ...searchFilters, year: e.target.value })}>
            <option value="">Tất cả</option>
            {years.map((year) => <option key={year} value={year}>{year}</option>)}
          </Select>
          <Select label="Trạng thái" value={searchFilters.status} onChange={(e) => setSearchFilters({ ...searchFilters, status: e.target.value })}>
            <option value="">Tất cả</option>
            <option value="PAID">Đã nộp</option>
            <option value="UNPAID">Chưa nộp</option>
          </Select>
        </div>
        <div className="mt-4 flex gap-3">
          <Button onClick={handleSearch}><Search className="h-4 w-4" /> Tìm kiếm</Button>
          <Button variant="secondary" onClick={handleResetSearch}>Xoá bộ lọc</Button>
        </div>
      </Card>

      {/* === Đơn giá hệ thống === */}
      <Card className="mb-5">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h3 className="text-base font-black text-slate-900">Đơn giá hệ thống</h3>
            <p className="text-sm text-slate-500">Đơn giá gốc dùng để tính tiền điện/nước/internet khi tạo hóa đơn mới.</p>
          </div>
        </div>
        {configMsg && (
          <div className="mb-3 rounded-xl bg-sky-50 px-4 py-2 text-sm font-semibold text-sky-700 ring-1 ring-sky-200">{configMsg}</div>
        )}
        <div className="grid gap-4 md:grid-cols-3">
          {configs.filter((c) => utilityConfigKeys.includes(c.configKey)).map((c) => (
            <div key={c.configKey} className="rounded-2xl border border-slate-200 p-4">
              <label className="mb-1.5 block text-sm font-semibold text-slate-700">{configLabel(c.configKey)}</label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  min="0"
                  value={configDraft[c.configKey] ?? ""}
                  onChange={(e) => setConfigDraft({ ...configDraft, [c.configKey]: e.target.value })}
                />
                <Button onClick={() => handleSaveConfig(c.configKey)} disabled={configSaving === c.configKey}>
                  {configSaving === c.configKey ? "..." : "Lưu"}
                </Button>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <h3 className="mb-4 text-lg font-bold">{editingBill ? "Chi tiết hóa đơn" : "Nhập hóa đơn mới"}</h3>
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                {editingBill ? (
                  <Input
                    label="Hộ"
                    value={editingBill.householdCode || formData.householdId}
                    disabled
                  />
                ) : (
                  <Select label="Căn hộ" value={formData.apartmentId} onChange={(e) => handleApartmentChange(e.target.value)}>
                    <option value="">{loadingApartments ? "Đang tải căn hộ..." : "Chọn căn hộ"}</option>
                    {apartmentOptions.map((apartment) => (
                      <option key={apartment.id} value={apartment.id}>
                        {apartment.code}{apartment.headOfHouseholdName ? ` - ${apartment.headOfHouseholdName}` : ""}
                      </option>
                    ))}
                  </Select>
                )}
                <Select label="Loại hóa đơn" value={formData.type} onChange={(e) => setFormData({ ...formData, type: e.target.value })}>
                  <option value="ELECTRICITY">Điện</option>
                  <option value="WATER">Nước</option>
                  <option value="INTERNET">Internet</option>
                </Select>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <Select label="Tháng" value={formData.month} onChange={(e) => setFormData({ ...formData, month: Number(e.target.value) })}>
                  {months.map((month) => <option key={month} value={month}>Tháng {month}</option>)}
                </Select>
                <Select label="Năm" value={formData.year} onChange={(e) => setFormData({ ...formData, year: Number(e.target.value) })}>
                  {years.map((year) => <option key={year} value={year}>{year}</option>)}
                </Select>
              </div>

              {isMetered(formData.type) ? (
                <>
                  <div className="grid gap-4 md:grid-cols-2">
                    <Input
                      label="Chỉ số cũ"
                      type="number"
                      min="0"
                      placeholder="VD: 1200"
                      value={formData.oldIndex}
                      onChange={(e) => setFormData({ ...formData, oldIndex: e.target.value })}
                    />
                    <Input
                      label="Chỉ số mới"
                      type="number"
                      min="0"
                      placeholder="VD: 1320"
                      value={formData.newIndex}
                      onChange={(e) => setFormData({ ...formData, newIndex: e.target.value })}
                    />
                  </div>
                  <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
                    Đơn giá hiện hành:{" "}
                    <strong>
                      {money(configValue(formData.type === "ELECTRICITY" ? CONFIG_KEYS.ELECTRICITY_UNIT_PRICE : CONFIG_KEYS.WATER_UNIT_PRICE))}
                    </strong>{" "}
                    / {formData.type === "ELECTRICITY" ? "số" : "khối"}.
                    {meteredPreview != null && (
                      <span className="ml-1">Tạm tính: <strong className="text-slate-900">{money(meteredPreview)}</strong></span>
                    )}
                  </div>
                </>
              ) : (
                <>
                  <Input
                    label="Số tiền (đ)"
                    type="number"
                    min="0"
                    placeholder={`Bỏ trống = lấy giá gói (${money(configValue(CONFIG_KEYS.INTERNET_PRICE))})`}
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  />
                  <p className="-mt-1 text-xs font-medium text-slate-500">
                    Để trống để dùng giá gói internet trong cấu hình hệ thống.
                  </p>
                </>
              )}

              {editingBill && (
                <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
                  Trạng thái hiện tại: <StatusBadge status={editingBill.status} />
                  {editingBill.status === "PAID" && <span className="ml-2">— hóa đơn đã nộp, không thể sửa.</span>}
                </div>
              )}

              {error && <div className="rounded-xl bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 ring-1 ring-rose-200">{error}</div>}

              <div className="flex flex-wrap justify-between gap-3 pt-2">
                <div className="flex gap-3">
                  {editingBill && (
                    <Button variant="danger" onClick={() => setDeleteConfirm(editingBill)}>Xóa</Button>
                  )}
                  {editingBill && editingBill.status === "UNPAID" && (
                    <Button variant="secondary" onClick={handleConfirmCash}>Ghi nhận nộp tiền mặt</Button>
                  )}
                </div>
                <div className="flex gap-3">
                  <Button variant="secondary" onClick={() => { setShowForm(false); setEditingBill(null); }}>Hủy</Button>
                  {(!editingBill || editingBill.status === "UNPAID") && (
                    <Button onClick={handleSave} disabled={saving}>{saving ? "Đang lưu…" : "Lưu"}</Button>
                  )}
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
              <div className="rounded-full bg-rose-100 p-3"><AlertCircle className="h-6 w-6 text-rose-600" /></div>
              <h3 className="text-lg font-bold text-slate-900">Xóa hóa đơn</h3>
            </div>
            <p className="mb-6 text-slate-600">
              Bạn có chắc muốn xóa hóa đơn <strong>{getUtilityLabel(deleteConfirm.type)}</strong> hộ <strong>{deleteConfirm.householdCode || deleteConfirm.householdId}</strong> tháng <strong>{deleteConfirm.month}/{deleteConfirm.year}</strong>?
            </p>
            <div className="flex justify-end gap-3">
              <Button variant="secondary" onClick={() => setDeleteConfirm(null)}>Hủy</Button>
              <Button variant="danger" onClick={handleConfirmDelete}>Xóa</Button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Thanh thao tác hàng loạt: hiện khi đang chọn ít nhất 1 hóa đơn chưa nộp. */}
      {selectedIds.size > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-4 flex flex-col gap-3 rounded-2xl bg-sky-50 px-5 py-4 ring-1 ring-sky-200 sm:flex-row sm:items-center sm:justify-between"
        >
          <p className="text-sm font-semibold text-sky-800">
            Đã chọn <strong>{selectedIds.size}</strong> hóa đơn chưa nộp
          </p>
          <div className="flex gap-3">
            <Button variant="secondary" onClick={() => setSelectedIds(new Set())}>
              <X className="h-4 w-4" /> Bỏ chọn
            </Button>
            <Button onClick={() => setBulkConfirm(true)}>
              <CheckCheck className="h-4 w-4" /> Xác nhận tiền mặt hàng loạt
            </Button>
          </div>
        </motion.div>
      )}

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-5 py-4">
                  <input
                    type="checkbox"
                    className="h-4 w-4 cursor-pointer rounded border-slate-300 text-sky-600 focus:ring-sky-400"
                    checked={allSelected}
                    disabled={selectableIds.length === 0}
                    onChange={toggleAll}
                    title="Chọn tất cả hóa đơn chưa nộp trên trang"
                  />
                </th>
                <th className="px-5 py-4">Hộ</th>
                <th className="px-5 py-4">Loại hóa đơn</th>
                <th className="px-5 py-4">Tháng/Năm</th>
                <th className="px-5 py-4">Chỉ số (cũ → mới)</th>
                <th className="px-5 py-4">Số tiền</th>
                <th className="px-5 py-4">Trạng thái</th>
                <th className="px-5 py-4 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading && (
                <tr><td colSpan={8} className="px-5 py-10 text-center text-sm font-semibold text-slate-500">Đang tải dữ liệu…</td></tr>
              )}
              {!loading && bills.length === 0 && (
                <tr><td colSpan={8} className="px-5 py-10 text-center text-sm font-semibold text-slate-500">Không có hóa đơn nào.</td></tr>
              )}
              {!loading && bills.map((bill) => {
                const unpaid = bill.status !== "PAID";
                const checked = selectedIds.has(bill.id);
                return (
                <tr key={bill.id} className={`transition ${checked ? "bg-sky-50/70" : "hover:bg-slate-50/80"}`}>
                  <td className="px-5 py-4">
                    <input
                      type="checkbox"
                      className="h-4 w-4 cursor-pointer rounded border-slate-300 text-sky-600 focus:ring-sky-400 disabled:cursor-not-allowed disabled:opacity-40"
                      checked={checked}
                      disabled={!unpaid}
                      onChange={() => toggleRow(bill.id)}
                      title={unpaid ? "Chọn hóa đơn này" : "Hóa đơn đã nộp"}
                    />
                  </td>
                  <td className="whitespace-nowrap px-5 py-4 font-semibold text-slate-800">{bill.householdCode || bill.householdId}</td>
                  <td className="whitespace-nowrap px-5 py-4 text-slate-700">{getUtilityLabel(bill.type)}</td>
                  <td className="whitespace-nowrap px-5 py-4 text-slate-700">{bill.month}/{bill.year}</td>
                  <td className="whitespace-nowrap px-5 py-4 text-slate-700">
                    {bill.oldIndex != null && bill.newIndex != null ? `${bill.oldIndex} → ${bill.newIndex}` : "—"}
                  </td>
                  <td className="whitespace-nowrap px-5 py-4 font-bold text-slate-900">{money(bill.amount)}</td>
                  <td className="whitespace-nowrap px-5 py-4 text-slate-700"><StatusBadge status={bill.status} /></td>
                  <td className="px-5 py-4 text-right">
                    <button onClick={() => handleEdit(bill)} className="font-semibold text-sky-700 hover:text-sky-900">Chi tiết</button>
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {!loading && total > 0 && (
          <div className="border-t border-slate-200">
            <Pagination page={page} total={total} pageSize={PAGE_SIZE} onPageChange={(p) => loadBills(p)} />
          </div>
        )}
      </div>

      {bulkConfirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
          <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-xl">
            <h3 className="mb-3 text-lg font-black">Xác nhận tiền mặt hàng loạt</h3>
            <p className="mb-5 text-sm text-slate-600">
              Xác nhận <strong>{selectedIds.size}</strong> hóa đơn đã được thu bằng tiền mặt? Thao tác này không thể hoàn tác.
            </p>
            <div className="flex justify-end gap-3">
              <Button variant="secondary" onClick={() => setBulkConfirm(false)} disabled={confirming}>Hủy</Button>
              <Button onClick={handleBulkConfirm} disabled={confirming}>{confirming ? "Đang xử lý…" : "Xác nhận tất cả"}</Button>
            </div>
          </motion.div>
        </div>
      )}

      {/* MODAL: sinh hóa đơn phí điện nước theo tháng */}
      {showFeeForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="w-full max-w-md rounded-3xl bg-white p-6 shadow-xl">
            <h3 className="mb-2 text-lg font-bold">Tạo hóa đơn điện nước</h3>
            <p className="mb-4 text-sm text-slate-600">
              Hệ thống tạo phiếu thu cho mỗi hộ (= tổng các hóa đơn điện/nước/internet <strong>chưa nộp</strong> của hộ trong tháng).
              Hóa đơn sẽ xuất hiện ở mục <strong>Thu phí / Công nợ</strong>; hộ dân có thể nộp tiền mặt hoặc thanh toán VNPay.
            </p>
            <div className="grid gap-4 md:grid-cols-2">
              <Select label="Tháng" value={feeForm.month} onChange={(e) => setFeeForm({ ...feeForm, month: Number(e.target.value) })}>
                {months.map((m) => <option key={m} value={m}>Tháng {m}</option>)}
              </Select>
              <Select label="Năm" value={feeForm.year} onChange={(e) => setFeeForm({ ...feeForm, year: Number(e.target.value) })}>
                {years.map((y) => <option key={y} value={y}>{y}</option>)}
              </Select>
            </div>
            {feeError && <div className="mt-4 rounded-xl bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 ring-1 ring-rose-200">{feeError}</div>}
            <div className="mt-5 flex justify-end gap-3">
              <Button variant="secondary" onClick={() => setShowFeeForm(false)} disabled={feeSaving}>Hủy</Button>
              <Button onClick={handleGenerateFees} disabled={feeSaving}>{feeSaving ? "Đang tạo…" : "Tạo hóa đơn"}</Button>
            </div>
          </motion.div>
        </div>
      )}

      {/* MODAL: nhập hóa đơn hàng loạt từ Excel */}
      {showImport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <h3 className="mb-2 text-lg font-bold">Nhập hóa đơn từ Excel</h3>
            <p className="mb-4 text-sm text-slate-600">
              Tải file mẫu, điền hóa đơn cho tất cả các hộ (mỗi dòng một hóa đơn), rồi tải file lên.
              Cột: <strong>Mã hộ, Loại (DIEN/NUOC/INTERNET), Tháng, Năm, Chỉ số cũ, Chỉ số mới, Số tiền (Internet)</strong>.
              Điện/nước cần chỉ số; internet để trống chỉ số (bỏ trống số tiền sẽ lấy giá gói cấu hình).
            </p>

            <Button variant="secondary" onClick={handleDownloadTemplate}>
              <Download className="h-4 w-4" /> Tải file mẫu (.xlsx)
            </Button>

            <label className="mt-4 block">
              <span className="mb-1.5 block text-sm font-semibold text-slate-700">Chọn file Excel (.xlsx)</span>
              <input
                type="file"
                accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                onChange={(e) => { setImportFile(e.target.files?.[0] || null); setImportError(""); setImportResult(null); }}
                className="block w-full text-sm text-slate-600 file:mr-4 file:rounded-xl file:border-0 file:bg-sky-600 file:px-4 file:py-2.5 file:text-sm file:font-semibold file:text-white hover:file:bg-sky-700"
              />
            </label>
            {importFile && (
              <p className="mt-2 flex items-center gap-2 text-sm font-medium text-slate-600">
                <FileSpreadsheet className="h-4 w-4 text-emerald-600" /> {importFile.name}
              </p>
            )}

            {importError && <div className="mt-4 rounded-xl bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 ring-1 ring-rose-200">{importError}</div>}

            {importResult && (
              <div className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm ring-1 ring-slate-200">
                <p className="font-semibold text-slate-800">
                  Tạo thành công <span className="text-emerald-700">{importResult.createdCount}</span> hóa đơn
                  {importResult.skippedCount > 0 && <> — bỏ qua <span className="text-amber-600">{importResult.skippedCount}</span> dòng (không có hộ)</>}
                  {importResult.failedCount > 0 && <> — lỗi <span className="text-rose-700">{importResult.failedCount}</span> dòng</>}
                </p>
                {importResult.errors?.length > 0 && (
                  <ul className="mt-2 max-h-40 list-disc space-y-1 overflow-y-auto pl-5 text-xs text-rose-700">
                    {importResult.errors.map((err, i) => <li key={i}>{err}</li>)}
                  </ul>
                )}
              </div>
            )}

            <div className="mt-5 flex justify-end gap-3">
              <Button variant="secondary" onClick={() => setShowImport(false)} disabled={importing}>Đóng</Button>
              <Button onClick={handleImport} disabled={importing || !importFile}>{importing ? "Đang nhập…" : "Nhập hóa đơn"}</Button>
            </div>
          </motion.div>
        </div>
      )}
    </>
  );
}
