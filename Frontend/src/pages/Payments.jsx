import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Search, Banknote, CheckCheck, X } from "lucide-react";
import { money } from "../utils/helpers";
import { Badge, Button, Card, Input, Select, Pagination } from "../components/common";
import { SectionHeader } from "../components/layout/SectionHeader";
import { listAdminPaymentsAPI, confirmCashPaymentAPI, confirmCashPaymentsBatchAPI } from "../api/paymentApi";

// ============================================================
//  Module 5 (ADMIN) — Thu phí / công nợ.
//  Nguồn dữ liệu: backend PaymentController (/api/admin/payments).
//  Admin xem phiếu nộp của từng hộ, xác nhận đã nộp tiền mặt (đơn lẻ hoặc hàng loạt).
//  PaymentDetailDTO: { id, feePeriodName, feeName, feeType(MANDATORY|DONATION), householdCode,
//    amountDue, amountPaid, status(UNPAID|PAID), paymentMethod, paidDate, collectedByName, transactionCode }
//  Mặc định sắp xếp theo hộ (household.id) để gom các phiếu cùng hộ liền nhau.
// ============================================================
const statusBadge = (p) => {
  if (p.status === "PAID") {
    return <Badge tone="green">{isDonation(p) ? "Đã đóng góp" : "Đã nộp"}</Badge>;
  }
  return <Badge tone={isDonation(p) ? "violet" : "red"}>{isDonation(p) ? "Chưa đóng góp" : "Chưa nộp"}</Badge>;
};
const methodLabel = (m) => (m === "CASH" ? "Tiền mặt" : m === "ONLINE" ? "VNPay" : "—");

// Khoản tự nguyện chưa chốt số tiền: không hiển thị "0 đ" mà để ký hiệu riêng cho dễ phân biệt.
const isDonation = (p) => p.feeType === "DONATION";
// Khoản tự nguyện chưa chốt số tiền -> khi thu tiền mặt phải nhập số tiền (không gộp hàng loạt được).
const needsAmount = (p) => isDonation(p) && !(Number(p.amountDue) > 0);
const dueDisplay = (p) => {
  if (isDonation(p) && !(Number(p.amountDue) > 0)) {
    return <span className="font-semibold text-violet-600">Tùy tâm</span>;
  }
  return <span className="font-semibold text-slate-900">{money(p.amountDue || 0)}</span>;
};
const paidDisplay = (p) => {
  if (!(Number(p.amountPaid) > 0)) return <span className="text-slate-400">—</span>;
  return <span className="font-semibold text-emerald-700">{money(p.amountPaid)}</span>;
};
const kindMatches = (p, kind) => kind === "ALL" || p.feeType === kind;

// Tính các thẻ thống kê từ danh sách phiếu ĐÃ lọc theo nhóm khoản (không lọc lại trong này).
const computeSummary = (rows) =>
  rows.reduce(
    (a, p) => {
      if (isDonation(p)) a.donationPaid += Number(p.amountPaid || 0);
      else {
        a.mandatoryDue += p.status === "PAID" ? 0 : Number(p.amountDue || 0);
        a.mandatoryPaid += Number(p.amountPaid || 0);
      }
      if (p.status === "PAID") a.paid += 1;
      else a.pending += 1;
      return a;
    },
    { mandatoryDue: 0, mandatoryPaid: 0, donationPaid: 0, paid: 0, pending: 0 }
  );

export function Payments() {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState("");
  const [filters, setFilters] = useState({ householdId: "", keyword: "", status: "ALL", kind: "ALL" });
  const [selected, setSelected] = useState(null);
  const [cashAmount, setCashAmount] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [toast, setToast] = useState(null);

  // Thao tác hàng loạt: tập id phiếu (UNPAID) đang được tick chọn.
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [bulkConfirm, setBulkConfirm] = useState(false);

  // Toàn bộ phiếu khớp bộ lọc (đã lọc theo nhóm khoản) — giữ ở client để phân trang & tính
  // thống kê mà không phải gọi lại API mỗi khi đổi trang.
  const [allRows, setAllRows] = useState([]);

  // Phân trang phía client trên allRows: 20 phiếu/trang.
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const PAGE_SIZE = 20;

  // Thống kê tính trên TOÀN BỘ phiếu khớp bộ lọc (không phụ thuộc trang đang xem).
  const [summary, setSummary] = useState({ mandatoryDue: 0, mandatoryPaid: 0, donationPaid: 0, paid: 0, pending: 0 });

  const showToast = (message, tone = "green") => {
    setToast({ message, tone });
    setTimeout(() => setToast(null), 3000);
  };

  // Hiển thị một trang từ allRows (đã có sẵn ở client) — không gọi API.
  const showPage = useCallback((rows, targetPage) => {
    setPayments(rows.slice((targetPage - 1) * PAGE_SIZE, targetPage * PAGE_SIZE));
    setPage(targetPage);
  }, []);

  // Tải phiếu nộp khớp bộ lọc MỘT LẦN, rồi tính thống kê + phân trang từ cùng dataset.
  // (overrideFilters dùng khi xoá bộ lọc để tránh đọc state cũ trong closure.)
  const loadPayments = useCallback(async (targetPage = 1, overrideFilters = null) => {
    const f = overrideFilters || filters;
    setLoading(true);
    setPageError("");
    setSelectedIds(new Set());
    const res = await listAdminPaymentsAPI({
      householdId: f.householdId || undefined,
      keyword: f.keyword || undefined,
      status: f.status !== "ALL" ? f.status : undefined,
      page: 0,
      size: 100000,
    });
    if (res.success) {
      const rows = (res.data?.items || []).filter((p) => kindMatches(p, f.kind));
      setAllRows(rows);
      setTotal(rows.length);
      setSummary(computeSummary(rows));
      showPage(rows, targetPage);
    } else {
      setPageError(res.message || "Không tải được danh sách phiếu nộp");
    }
    setLoading(false);
  }, [filters, showPage]);

  useEffect(() => {
    loadPayments(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSearch = () => loadPayments(1);

  const handleResetFilters = () => {
    const reset = { householdId: "", keyword: "", status: "ALL", kind: "ALL" };
    setFilters(reset);
    loadPayments(1, reset);
  };

  // ----- Lựa chọn hàng loạt -----
  // Bỏ qua khoản tự nguyện chưa chốt số tiền: phải nhập tiền nên xác nhận riêng từng phiếu.
  const selectableIds = payments.filter((p) => p.status !== "PAID" && !needsAmount(p)).map((p) => p.id);
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

  const handleConfirmCash = async () => {
    if (!selected) return;
    // Khoản tự nguyện: cần nhập số tiền đóng góp > 0 trước khi xác nhận.
    let amount;
    if (needsAmount(selected)) {
      amount = Number(cashAmount);
      if (!(amount > 0)) {
        showToast("Vui lòng nhập số tiền đóng góp lớn hơn 0", "red");
        return;
      }
    }
    setConfirming(true);
    const res = await confirmCashPaymentAPI(selected.id, amount);
    setConfirming(false);
    if (!res.success) {
      showToast(res.message || "Xác nhận thất bại", "red");
      return;
    }
    setSelected(null);
    setCashAmount("");
    showToast("Đã xác nhận nộp tiền mặt");
    await loadPayments(page);
  };

  const handleBulkConfirm = async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    setConfirming(true);
    const res = await confirmCashPaymentsBatchAPI(ids);
    setConfirming(false);
    setBulkConfirm(false);
    if (res.failed > 0) {
      showToast(`Đã xác nhận ${res.ok}/${ids.length} phiếu. ${res.failed} phiếu lỗi.`, res.ok > 0 ? "green" : "red");
    } else {
      showToast(`Đã xác nhận tiền mặt cho ${res.ok} phiếu`);
    }
    await loadPayments(page);
  };

  return (
    <>
      <SectionHeader
        title="Thu phí / Công nợ"
      />

      {toast && (
        <div className={`mb-5 rounded-2xl px-4 py-3 text-sm font-semibold ring-1 ${toast.tone === "red" ? "bg-rose-50 text-rose-700 ring-rose-200" : "bg-emerald-50 text-emerald-700 ring-emerald-200"}`}>{toast.message}</div>
      )}

      <div className="mb-5 grid gap-4 md:grid-cols-4">
        <Card><p className="text-sm font-semibold text-slate-500">Công nợ bắt buộc</p><p className="mt-2 text-2xl font-black text-rose-700">{money(summary.mandatoryDue)}</p></Card>
        <Card><p className="text-sm font-semibold text-slate-500">Đã thu phí</p><p className="mt-2 text-2xl font-black text-emerald-700">{money(summary.mandatoryPaid)}</p></Card>
        <Card><p className="text-sm font-semibold text-slate-500">Tổng đóng góp</p><p className="mt-2 text-2xl font-black text-violet-700">{money(summary.donationPaid)}</p></Card>
        <Card>
          <p className="text-sm font-semibold text-slate-500">Mục đang mở</p>
          <p className="mt-2 text-2xl font-black text-slate-900">{summary.pending}</p>
        </Card>
      </div>

      {pageError && (
        <div className="mb-5 rounded-xl bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 ring-1 ring-rose-200">{pageError}</div>
      )}

      <Card className="mb-5">
        <div className="grid gap-4 md:grid-cols-5">
          <Input
            label="Mã hộ (householdId)"
            placeholder="VD: 1"
            value={filters.householdId}
            onChange={(e) => setFilters({ ...filters, householdId: e.target.value })}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          />
          <Input
            label="Khoản thu"
            placeholder="VD: phí quản lý"
            value={filters.keyword}
            onChange={(e) => setFilters({ ...filters, keyword: e.target.value })}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          />
          <Select label="Trạng thái" value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })}>
            <option value="ALL">Tất cả</option>
            <option value="PAID">Đã nộp</option>
            <option value="UNPAID">Chưa nộp</option>
          </Select>
          <Select label="Nhóm khoản" value={filters.kind} onChange={(e) => setFilters({ ...filters, kind: e.target.value })}>
            <option value="ALL">Tất cả</option>
            <option value="MANDATORY">Công nợ bắt buộc</option>
            <option value="DONATION">Đóng góp</option>
          </Select>
          <div className="flex items-end gap-3">
            <Button onClick={handleSearch}><Search className="h-4 w-4" /> Tìm kiếm</Button>
            <Button variant="secondary" onClick={handleResetFilters}>Xóa bộ lọc</Button>
          </div>
        </div>
      </Card>

      {/* Thanh thao tác hàng loạt: hiện khi đang chọn ít nhất 1 phiếu chưa nộp. */}
      {selectedIds.size > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-4 flex flex-col gap-3 rounded-2xl bg-sky-50 px-5 py-4 ring-1 ring-sky-200 sm:flex-row sm:items-center sm:justify-between"
        >
          <p className="text-sm font-semibold text-sky-800">
            Đã chọn <strong>{selectedIds.size}</strong> phiếu chưa nộp
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
                    title="Chọn tất cả phiếu chưa nộp trên trang"
                  />
                </th>
                <th className="px-5 py-4">Hộ</th>
                <th className="px-5 py-4">Khoản thu</th>
                <th className="px-5 py-4">Đợt thu</th>
                <th className="px-5 py-4 text-right">Số tiền</th>
                <th className="px-5 py-4 text-right">Đã nộp</th>
                <th className="px-5 py-4">Hình thức</th>
                <th className="px-5 py-4">Trạng thái</th>
                <th className="px-5 py-4 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading && <tr><td colSpan={9} className="px-5 py-10 text-center text-sm font-semibold text-slate-500">Đang tải dữ liệu…</td></tr>}
              {!loading && payments.length === 0 && <tr><td colSpan={9} className="px-5 py-10 text-center text-sm font-semibold text-slate-500">Không có phiếu nộp nào.</td></tr>}
              {!loading && payments.map((p) => {
                const unpaid = p.status !== "PAID";
                const checked = selectedIds.has(p.id);
                const selectable = unpaid && !needsAmount(p);
                return (
                  <tr key={p.id} className={`transition ${checked ? "bg-sky-50/70" : "hover:bg-slate-50/80"}`}>
                    <td className="px-5 py-4">
                      <input
                        type="checkbox"
                        className="h-4 w-4 cursor-pointer rounded border-slate-300 text-sky-600 focus:ring-sky-400 disabled:cursor-not-allowed disabled:opacity-40"
                        checked={checked}
                        disabled={!selectable}
                        onChange={() => toggleRow(p.id)}
                        title={!unpaid ? "Phiếu đã nộp" : needsAmount(p) ? "Khoản tự nguyện — thu tiền mặt riêng để nhập số tiền" : "Chọn phiếu này"}
                      />
                    </td>
                    <td className="whitespace-nowrap px-5 py-4 font-semibold text-slate-800">{p.householdCode || p.householdId}</td>
                    <td className="px-5 py-4 text-slate-700">{p.feeName || "—"}</td>
                    <td className="px-5 py-4 text-slate-700">{p.feePeriodName || "—"}</td>
                    <td className="whitespace-nowrap px-5 py-4 text-right tabular-nums">{dueDisplay(p)}</td>
                    <td className="whitespace-nowrap px-5 py-4 text-right tabular-nums">{paidDisplay(p)}</td>
                    <td className="whitespace-nowrap px-5 py-4 text-slate-700">{methodLabel(p.paymentMethod)}</td>
                    <td className="whitespace-nowrap px-5 py-4">{statusBadge(p)}</td>
                    <td className="px-5 py-4">
                      <div className="flex justify-end">
                        {unpaid ? (
                          <button
                            onClick={() => { setSelected(p); setCashAmount(""); }}
                            title="Xác nhận đã nộp tiền mặt"
                            className="inline-flex items-center gap-1.5 rounded-lg border border-sky-200 px-2.5 py-1.5 text-xs font-semibold text-sky-700 transition hover:bg-sky-50"
                          >
                            <Banknote className="h-4 w-4" /> Thu tiền mặt
                          </button>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {!loading && total > 0 && (
          <div className="border-t border-slate-200">
            <Pagination page={page} total={total} pageSize={PAGE_SIZE} onPageChange={(p) => { setSelectedIds(new Set()); showPage(allRows, p); }} />
          </div>
        )}
      </div>

      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-xl">
            <h3 className="mb-3 text-lg font-black">Xác nhận nộp tiền mặt</h3>
            {needsAmount(selected) ? (
              <>
                <p className="mb-4 text-sm text-slate-600">
                  Khoản <strong>{selected.feeName || selected.feePeriodName}</strong> là khoản tự nguyện. Nhập số tiền hộ <strong>{selected.householdCode || selected.householdId}</strong> đóng góp bằng tiền mặt:
                </p>
                <div className="mb-5">
                  <Input
                    label="Số tiền đóng góp (đ)"
                    type="number"
                    min="0"
                    placeholder="VD: 200000"
                    value={cashAmount}
                    onChange={(e) => setCashAmount(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleConfirmCash()}
                    autoFocus
                  />
                </div>
              </>
            ) : (
              <p className="mb-5 text-sm text-slate-600">
                Xác nhận hộ <strong>{selected.householdCode || selected.householdId}</strong> đã nộp đủ <strong>{money(selected.amountDue)}</strong> cho khoản <strong>{selected.feeName || selected.feePeriodName}</strong> bằng tiền mặt?
              </p>
            )}
            <div className="flex justify-end gap-3">
              <Button variant="secondary" onClick={() => { setSelected(null); setCashAmount(""); }}>Hủy</Button>
              <Button onClick={handleConfirmCash} disabled={confirming}>{confirming ? "Đang xử lý…" : "Xác nhận"}</Button>
            </div>
          </motion.div>
        </div>
      )}

      {bulkConfirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
          <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-xl">
            <h3 className="mb-3 text-lg font-black">Xác nhận tiền mặt hàng loạt</h3>
            <p className="mb-5 text-sm text-slate-600">
              Xác nhận <strong>{selectedIds.size}</strong> phiếu nộp đã được thu bằng tiền mặt? Thao tác này không thể hoàn tác.
            </p>
            <div className="flex justify-end gap-3">
              <Button variant="secondary" onClick={() => setBulkConfirm(false)} disabled={confirming}>Hủy</Button>
              <Button onClick={handleBulkConfirm} disabled={confirming}>{confirming ? "Đang xử lý…" : "Xác nhận tất cả"}</Button>
            </div>
          </motion.div>
        </div>
      )}
    </>
  );
}
