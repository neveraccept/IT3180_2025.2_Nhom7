import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Search } from "lucide-react";
import { money } from "../utils/helpers";
import { Badge, Button, Card, Input, Select } from "../components/common";
import { SectionHeader } from "../components/layout/SectionHeader";
import { listAdminPaymentsAPI, confirmCashPaymentAPI } from "../api/paymentApi";

// ============================================================
//  Module 5 (ADMIN) — Thu phí / công nợ.
//  Nguồn dữ liệu: backend PaymentController (/api/admin/payments).
//  Admin xem phiếu nộp của từng hộ, xác nhận đã nộp tiền mặt.
//  PaymentDetailDTO: { id, feePeriodName, feeName, householdCode, amountDue, amountPaid,
//    status(PENDING|PAID), paymentMethod, paidDate, collectedByName, transactionCode }
//  Lưu ý: phiếu nộp được backend sinh từ đợt thu (FeePeriod); FE không lập đợt hàng loạt ở đây.
// ============================================================
const statusBadge = (status) => (
  <Badge tone={status === "PAID" ? "green" : "red"}>{status === "PAID" ? "Đã nộp" : "Chưa nộp"}</Badge>
);
const methodLabel = (m) => (m === "CASH" ? "Tiền mặt" : m === "ONLINE" ? "VNPay" : "__");

export function Payments() {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState("");
  const [filters, setFilters] = useState({ householdId: "", status: "ALL" });
  const [selected, setSelected] = useState(null);
  const [confirming, setConfirming] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (message, tone = "green") => {
    setToast({ message, tone });
    setTimeout(() => setToast(null), 3000);
  };

  const loadPayments = useCallback(async () => {
    setLoading(true);
    setPageError("");
    const res = await listAdminPaymentsAPI({
      householdId: filters.householdId || undefined,
      status: filters.status !== "ALL" ? filters.status : undefined,
    });
    if (res.success) setPayments(res.data?.items || []);
    else setPageError(res.message || "Không tải được danh sách phiếu nộp");
    setLoading(false);
  }, [filters]);

  useEffect(() => {
    loadPayments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleResetFilters = () => {
    setFilters({ householdId: "", status: "ALL" });
    setTimeout(loadPayments, 0);
  };

  const handleConfirmCash = async () => {
    if (!selected) return;
    setConfirming(true);
    const res = await confirmCashPaymentAPI(selected.id);
    setConfirming(false);
    if (!res.success) {
      showToast(res.message || "Xác nhận thất bại", "red");
      return;
    }
    setSelected(null);
    showToast("Đã xác nhận nộp tiền mặt");
    await loadPayments();
  };

  const summary = payments.reduce(
    (acc, p) => {
      acc.totalDue += Number(p.amountDue || 0);
      acc.totalPaid += Number(p.amountPaid || 0);
      if (p.status === "PAID") acc.paid += 1;
      else acc.pending += 1;
      return acc;
    },
    { totalDue: 0, totalPaid: 0, paid: 0, pending: 0 }
  );

  return (
    <>
      <SectionHeader
        title="Thu phí / Công nợ"
        desc="Danh sách phiếu nộp của các hộ. Xác nhận khi hộ nộp tiền mặt; phiếu thanh toán online (VNPay) được cập nhật tự động."
      />

      {toast && (
        <div className={`mb-5 rounded-2xl px-4 py-3 text-sm font-semibold ring-1 ${toast.tone === "red" ? "bg-rose-50 text-rose-700 ring-rose-200" : "bg-emerald-50 text-emerald-700 ring-emerald-200"}`}>{toast.message}</div>
      )}

      <div className="mb-5 grid gap-4 md:grid-cols-4">
        <Card><p className="text-sm font-semibold text-slate-500">Tổng phải thu</p><p className="mt-2 text-2xl font-black">{money(summary.totalDue)}</p></Card>
        <Card><p className="text-sm font-semibold text-slate-500">Đã thu</p><p className="mt-2 text-2xl font-black text-emerald-700">{money(summary.totalPaid)}</p></Card>
        <Card><p className="text-sm font-semibold text-slate-500">Phiếu đã nộp</p><p className="mt-2 text-2xl font-black text-emerald-700">{summary.paid}</p></Card>
        <Card><p className="text-sm font-semibold text-slate-500">Phiếu chưa nộp</p><p className="mt-2 text-2xl font-black text-rose-700">{summary.pending}</p></Card>
      </div>

      {pageError && (
        <div className="mb-5 rounded-xl bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 ring-1 ring-rose-200">{pageError}</div>
      )}

      <Card className="mb-5">
        <div className="grid gap-4 md:grid-cols-3">
          <Input
            label="Mã hộ (householdId)"
            placeholder="VD: 1"
            value={filters.householdId}
            onChange={(e) => setFilters({ ...filters, householdId: e.target.value })}
            onKeyDown={(e) => e.key === "Enter" && loadPayments()}
          />
          <Select label="Trạng thái" value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })}>
            <option value="ALL">Tất cả</option>
            <option value="PAID">Đã nộp</option>
            <option value="PENDING">Chưa nộp</option>
          </Select>
          <div className="flex items-end gap-3">
            <Button onClick={loadPayments}><Search className="h-4 w-4" /> Tìm kiếm</Button>
            <Button variant="secondary" onClick={handleResetFilters}>Xóa bộ lọc</Button>
          </div>
        </div>
      </Card>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-5 py-4">Hộ</th>
                <th className="px-5 py-4">Khoản thu</th>
                <th className="px-5 py-4">Đợt thu</th>
                <th className="px-5 py-4">Cần đóng</th>
                <th className="px-5 py-4">Đã nộp</th>
                <th className="px-5 py-4">Hình thức</th>
                <th className="px-5 py-4">Trạng thái</th>
                <th className="px-5 py-4 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading && <tr><td colSpan={8} className="px-5 py-10 text-center text-sm font-semibold text-slate-500">Đang tải dữ liệu…</td></tr>}
              {!loading && payments.length === 0 && <tr><td colSpan={8} className="px-5 py-10 text-center text-sm font-semibold text-slate-500">Không có phiếu nộp nào.</td></tr>}
              {!loading && payments.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50/80">
                  <td className="whitespace-nowrap px-5 py-4 font-semibold text-slate-800">{p.householdCode || p.householdId}</td>
                  <td className="px-5 py-4 text-slate-700">{p.feeName || "__"}</td>
                  <td className="px-5 py-4 text-slate-700">{p.feePeriodName || "__"}</td>
                  <td className="whitespace-nowrap px-5 py-4 text-slate-700">{money(p.amountDue)}</td>
                  <td className="whitespace-nowrap px-5 py-4 text-slate-700">{money(p.amountPaid || 0)}</td>
                  <td className="whitespace-nowrap px-5 py-4 text-slate-700">{methodLabel(p.paymentMethod)}</td>
                  <td className="whitespace-nowrap px-5 py-4">{statusBadge(p.status)}</td>
                  <td className="px-5 py-4 text-right">
                    {p.status === "PAID" ? (
                      <span className="text-slate-400">Đã nộp</span>
                    ) : (
                      <button onClick={() => setSelected(p)} className="font-semibold text-sky-700 hover:text-sky-900">Xác nhận tiền mặt</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-xl">
            <h3 className="mb-3 text-lg font-black">Xác nhận nộp tiền mặt</h3>
            <p className="mb-5 text-sm text-slate-600">
              Xác nhận hộ <strong>{selected.householdCode || selected.householdId}</strong> đã nộp đủ <strong>{money(selected.amountDue)}</strong> cho khoản <strong>{selected.feeName || selected.feePeriodName}</strong> bằng tiền mặt?
            </p>
            <div className="flex justify-end gap-3">
              <Button variant="secondary" onClick={() => setSelected(null)}>Hủy</Button>
              <Button onClick={handleConfirmCash} disabled={confirming}>{confirming ? "Đang xử lý…" : "Xác nhận"}</Button>
            </div>
          </motion.div>
        </div>
      )}
    </>
  );
}
