import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Search, Plus, AlertCircle } from "lucide-react";
import { money } from "../utils/helpers";
import { Button, Card, Input, Select, StatusBadge } from "../components/common";
import { SectionHeader } from "../components/layout/SectionHeader";
import {
  searchUtilityBillsAPI,
  createUtilityBillAPI,
  updateUtilityBillAPI,
  deleteUtilityBillAPI,
  confirmCashUtilityBillAPI,
} from "../api/utilityApi";

// ============================================================
//  Module 7 — Quản lý hoá đơn điện/nước/internet (ADMIN).
//  Nguồn dữ liệu: backend UtilityBillController.
//  LƯU Ý: backend lưu trực tiếp `amount` cho mỗi hoá đơn (không có chỉ số cũ/mới,
//  không có bảng đơn giá) → form nhập thẳng số tiền. Giữ nguyên UI/Tailwind.
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

  const [showForm, setShowForm] = useState(false);
  const [editingBill, setEditingBill] = useState(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const [searchFilters, setSearchFilters] = useState({ householdId: "", type: "", month: "", year: "", status: "" });
  const emptyForm = { householdId: "", type: "ELECTRICITY", month: new Date().getMonth() + 1, year: new Date().getFullYear(), amount: "" };
  const [formData, setFormData] = useState(emptyForm);

  const getUtilityLabel = (type) => utilityTypes.find((item) => item.value === type)?.label || type;

  const loadBills = useCallback(async () => {
    setLoading(true);
    setPageError("");
    const res = await searchUtilityBillsAPI({
      householdId: searchFilters.householdId || undefined,
      type: searchFilters.type || undefined,
      month: searchFilters.month || undefined,
      year: searchFilters.year || undefined,
      status: searchFilters.status || undefined,
    });
    if (res.success) setBills(res.data?.items || []);
    else setPageError(res.message || "Không tải được danh sách hoá đơn");
    setLoading(false);
  }, [searchFilters]);

  useEffect(() => {
    loadBills();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSearch = () => loadBills();
  const handleResetSearch = () => {
    setSearchFilters({ householdId: "", type: "", month: "", year: "", status: "" });
    setTimeout(loadBills, 0);
  };

  const openCreateForm = () => {
    setFormData(emptyForm);
    setEditingBill(null);
    setError("");
    setShowForm(true);
  };

  const handleEdit = (bill) => {
    setFormData({
      householdId: String(bill.householdId ?? ""),
      type: bill.type,
      month: bill.month,
      year: bill.year,
      amount: bill.amount != null ? String(bill.amount) : "",
    });
    setEditingBill(bill);
    setError("");
    setShowForm(true);
  };

  const handleSave = async () => {
    const amount = Number(formData.amount || 0);
    if (!editingBill && !String(formData.householdId).trim()) {
      setError("Vui lòng nhập mã hộ (householdId)");
      return;
    }
    if (amount <= 0) {
      setError("Số tiền phải lớn hơn 0");
      return;
    }

    setSaving(true);
    setError("");
    let res;
    if (editingBill) {
      // Backend chỉ cho sửa khi UNPAID; gửi các trường có thể đổi.
      res = await updateUtilityBillAPI(editingBill.id, {
        type: formData.type,
        month: Number(formData.month),
        year: Number(formData.year),
        amount,
      });
    } else {
      res = await createUtilityBillAPI({
        householdId: Number(formData.householdId),
        type: formData.type,
        month: Number(formData.month),
        year: Number(formData.year),
        amount,
      });
    }
    setSaving(false);
    if (!res.success) {
      setError(res.message || "Lưu hoá đơn thất bại");
      return;
    }
    setShowForm(false);
    setEditingBill(null);
    await loadBills();
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
    await loadBills();
  };

  const handleConfirmDelete = async () => {
    if (!deleteConfirm) return;
    const res = await deleteUtilityBillAPI(deleteConfirm.id);
    setDeleteConfirm(null);
    if (!res.success) {
      setPageError(res.message || "Xoá hoá đơn thất bại");
      return;
    }
    setShowForm(false);
    setEditingBill(null);
    await loadBills();
  };

  return (
    <>
      <SectionHeader
        title="Quản lý phí điện, nước, internet"
        desc="Nhập hoá đơn theo từng hộ và từng tháng, ghi nhận đã nộp, tra cứu theo hộ."
        action={<Button onClick={openCreateForm}><Plus className="h-4 w-4" /> Nhập hóa đơn</Button>}
      />

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

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <h3 className="mb-4 text-lg font-bold">{editingBill ? "Chi tiết hóa đơn" : "Nhập hóa đơn mới"}</h3>
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <Input
                  label="Mã hộ (householdId)"
                  placeholder="VD: 1"
                  value={formData.householdId}
                  disabled={!!editingBill}
                  onChange={(e) => setFormData({ ...formData, householdId: e.target.value })}
                />
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

              <Input label="Số tiền (đ)" type="number" min="0" placeholder="VD: 350000" value={formData.amount} onChange={(e) => setFormData({ ...formData, amount: e.target.value })} />

              {editingBill && (
                <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
                  Trạng thái hiện tại: <StatusBadge status={editingBill.status} />
                  {editingBill.status === "PAID" && <span className="ml-2">— hoá đơn đã nộp, không thể sửa.</span>}
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

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-5 py-4">Hộ</th>
                <th className="px-5 py-4">Loại hóa đơn</th>
                <th className="px-5 py-4">Tháng/Năm</th>
                <th className="px-5 py-4">Số tiền</th>
                <th className="px-5 py-4">Trạng thái</th>
                <th className="px-5 py-4 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading && (
                <tr><td colSpan={6} className="px-5 py-10 text-center text-sm font-semibold text-slate-500">Đang tải dữ liệu…</td></tr>
              )}
              {!loading && bills.length === 0 && (
                <tr><td colSpan={6} className="px-5 py-10 text-center text-sm font-semibold text-slate-500">Không có hoá đơn nào.</td></tr>
              )}
              {!loading && bills.map((bill) => (
                <tr key={bill.id} className="hover:bg-slate-50/80">
                  <td className="whitespace-nowrap px-5 py-4 font-semibold text-slate-800">{bill.householdCode || bill.householdId}</td>
                  <td className="whitespace-nowrap px-5 py-4 text-slate-700">{getUtilityLabel(bill.type)}</td>
                  <td className="whitespace-nowrap px-5 py-4 text-slate-700">{bill.month}/{bill.year}</td>
                  <td className="whitespace-nowrap px-5 py-4 font-bold text-slate-900">{money(bill.amount)}</td>
                  <td className="whitespace-nowrap px-5 py-4 text-slate-700"><StatusBadge status={bill.status} /></td>
                  <td className="px-5 py-4 text-right">
                    <button onClick={() => handleEdit(bill)} className="font-semibold text-sky-700 hover:text-sky-900">Chi tiết</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
