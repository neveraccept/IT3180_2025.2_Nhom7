import { useState, useEffect, useCallback } from "react";
import { CreditCard } from "lucide-react";
import { money } from "../utils/helpers";
import { Badge, Button, Card, Select, StatusBadge } from "../components/common";
import { SectionHeader } from "../components/layout/SectionHeader";
import { listMyHouseholdPaymentsAPI } from "../api/paymentApi";
import { listMyUtilityBillsAPI } from "../api/utilityApi";
import { listMyVnpayHistoryAPI, createVnpayUrlAPI, VNPAY_TARGET } from "../api/vnpayApi";

// ============================================================
//  Module 5 (RESIDENT) — Khoản phí của tôi + thanh toán VNPay.
//  Nguồn dữ liệu: /api/payments/my-household, /api/utility-bills/my-household,
//                 /api/payments/vnpay/my-history.
//  Nút "Thanh toán VNPay" gọi create-url rồi redirect cư dân sang cổng VNPay.
//  Backend xử lý xong sẽ redirect về /payment-result (VnpayReturnPage).
// ============================================================
const utilityLabel = (type) => ({ ELECTRICITY: "Điện", WATER: "Nước", INTERNET: "Internet" }[type] || type);
const txStatusBadge = (status) => {
  const map = {
    SUCCESS: ["Thành công", "green"],
    PENDING: ["Đang chờ", "yellow"],
    FAILED: ["Thất bại", "red"],
    CANCELLED: ["Đã huỷ", "gray"],
  };
  const [label, tone] = map[status] || [status, "gray"];
  return <Badge tone={tone}>{label}</Badge>;
};
const feeTypeBadge = (feeType) => {
  if (feeType === "DONATION") return <Badge tone="violet">Đóng góp</Badge>;
  if (feeType === "MANDATORY") return <Badge tone="red">Bắt buộc</Badge>;
  return <Badge tone="gray">Hóa đơn</Badge>;
};

export function MyFees() {
  const [payments, setPayments] = useState([]);
  const [bills, setBills] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState("");
  const [filters, setFilters] = useState({ status: "ALL" });
  const [payingId, setPayingId] = useState(null);
  const [donationAmounts, setDonationAmounts] = useState({});

  const loadAll = useCallback(async () => {
    setLoading(true);
    setPageError("");
    const [pRes, bRes, hRes] = await Promise.all([
      listMyHouseholdPaymentsAPI(),
      listMyUtilityBillsAPI(),
      listMyVnpayHistoryAPI(),
    ]);
    if (pRes.success) setPayments(pRes.data?.items || []);
    else setPageError(pRes.message || "Không tải được khoản phí của hộ");
    if (bRes.success) setBills(bRes.data?.items || []);
    if (hRes.success) setHistory(hRes.data?.items || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  // Gọi backend lấy URL VNPay rồi redirect.
  const payWithVnpay = async (targetType, targetId, rowKey, feeType) => {
    const payload = { targetType, targetId };
    if (feeType === "DONATION") {
      const customAmount = Number(donationAmounts[rowKey]);
      if (!(customAmount > 0)) {
        setPageError("Vui lòng nhập số tiền đóng góp lớn hơn 0 trước khi thanh toán.");
        return;
      }
      payload.customAmount = customAmount;
    }
    setPayingId(rowKey);
    setPageError("");
    const res = await createVnpayUrlAPI(payload);
    if (res.success && res.data?.paymentUrl) {
      window.location.href = res.data.paymentUrl; // chuyển sang cổng VNPay
      return;
    }
    setPayingId(null);
    setPageError(res.message || "Không tạo được liên kết thanh toán VNPay");
  };

  // Gộp phí + hoá đơn thành các dòng công nợ thống nhất.
  const feeRows = payments.map((p) => ({
    key: `FEE-${p.id}`,
    targetType: VNPAY_TARGET.FEE_PAYMENT,
    targetId: p.id,
    group: "Khoản phí",
    name: p.feeName || p.feePeriodName || "Khoản phí",
    period: p.feePeriodName || "__",
    amount: Number(p.amountDue || 0),
    feeType: p.feeType || "MANDATORY",
    feePeriodStatus: p.feePeriodStatus || "OPEN",
    status: p.status === "PAID" ? "PAID" : "UNPAID",
  }));
  const billRows = bills.map((b) => ({
    key: `BILL-${b.id}`,
    targetType: VNPAY_TARGET.UTILITY_BILL,
    targetId: b.id,
    group: utilityLabel(b.type),
    name: `Hoá đơn ${utilityLabel(b.type).toLowerCase()}`,
    period: `Tháng ${b.month}/${b.year}`,
    amount: Number(b.amount || 0),
    feeType: "UTILITY",
    feePeriodStatus: "OPEN",
    status: b.status === "PAID" ? "PAID" : "UNPAID",
  }));

  const allRows = [...feeRows, ...billRows].filter((r) =>
    filters.status === "ALL" ? true : r.status === filters.status
  );

  const summary = [...feeRows, ...billRows].reduce(
    (acc, r) => {
      if (r.status === "UNPAID") {
        acc.totalDue += r.amount;
        acc.unpaid += 1;
      } else {
        acc.totalPaid += r.amount;
      }
      return acc;
    },
    { totalDue: 0, totalPaid: 0, unpaid: 0 }
  );

  return (
    <>
      <SectionHeader
        title="Khoản phí của tôi"
        desc="Các khoản phí và hoá đơn điện/nước/internet của hộ bạn. Bấm Thanh toán VNPay để thanh toán online."
      />

      {pageError && (
        <div className="mb-5 rounded-xl bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 ring-1 ring-rose-200">{pageError}</div>
      )}

      <div className="mb-5 grid gap-4 md:grid-cols-3">
        <Card><p className="text-sm font-semibold text-slate-500">Tổng còn phải nộp</p><p className="mt-2 text-2xl font-black text-rose-700">{money(summary.totalDue)}</p></Card>
        <Card><p className="text-sm font-semibold text-slate-500">Đã nộp</p><p className="mt-2 text-2xl font-black text-emerald-700">{money(summary.totalPaid)}</p></Card>
        <Card><p className="text-sm font-semibold text-slate-500">Khoản chưa nộp</p><p className="mt-2 text-2xl font-black text-rose-700">{summary.unpaid}</p></Card>
      </div>

      <Card className="mb-5">
        <div className="grid gap-3 md:grid-cols-3">
          <Select label="Trạng thái" value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })}>
            <option value="ALL">Tất cả</option>
            <option value="PAID">Đã nộp</option>
            <option value="UNPAID">Chưa nộp</option>
          </Select>
        </div>
      </Card>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-5 py-4">Nhóm</th>
                <th className="px-5 py-4">Nội dung</th>
                <th className="px-5 py-4">Loại phí</th>
                <th className="px-5 py-4">Kỳ</th>
                <th className="px-5 py-4">Số tiền</th>
                <th className="px-5 py-4">Trạng thái</th>
                <th className="px-5 py-4 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading && <tr><td colSpan={7} className="px-5 py-10 text-center text-sm font-semibold text-slate-500">Đang tải dữ liệu…</td></tr>}
              {!loading && allRows.length === 0 && <tr><td colSpan={7} className="px-5 py-10 text-center text-sm font-semibold text-slate-500">Không có khoản phí nào phù hợp với bộ lọc.</td></tr>}
              {!loading && allRows.map((r) => (
                <tr key={r.key} className="hover:bg-slate-50/80">
                  <td className="whitespace-nowrap px-5 py-4 text-slate-700">{r.group}</td>
                  <td className="px-5 py-4 font-semibold text-slate-800">{r.name}</td>
                  <td className="whitespace-nowrap px-5 py-4">{feeTypeBadge(r.feeType)}</td>
                  <td className="whitespace-nowrap px-5 py-4 text-slate-700">{r.period}</td>
                  <td className="whitespace-nowrap px-5 py-4 font-bold text-slate-900">
                    {r.feeType === "DONATION" && r.status === "UNPAID" ? (
                      <input
                        className="w-40 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
                        type="number"
                        min="0"
                        placeholder="Nhập số tiền"
                        value={donationAmounts[r.key] ?? ""}
                        onChange={(e) => setDonationAmounts({ ...donationAmounts, [r.key]: e.target.value })}
                      />
                    ) : (
                      money(r.amount)
                    )}
                  </td>
                  <td className="whitespace-nowrap px-5 py-4"><StatusBadge status={r.status} /></td>
                  <td className="px-5 py-4 text-right">
                    {r.status === "UNPAID" && r.feePeriodStatus === "CLOSED" ? (
                      <span className="font-semibold text-slate-500">Đợt thu đã đóng</span>
                    ) : r.status === "UNPAID" ? (
                      <Button onClick={() => payWithVnpay(r.targetType, r.targetId, r.key, r.feeType)} disabled={payingId === r.key}>
                        <CreditCard className="h-4 w-4" /> {payingId === r.key ? "Đang chuyển…" : "Thanh toán VNPay"}
                      </Button>
                    ) : (
                      <span className="font-semibold text-emerald-600">Đã thanh toán</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Lịch sử giao dịch VNPay */}
      <div className="mt-8">
        <SectionHeader title="Lịch sử thanh toán VNPay" desc="Các giao dịch online của hộ bạn." />
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-5 py-4">Mã giao dịch</th>
                  <th className="px-5 py-4">Loại</th>
                  <th className="px-5 py-4">Số tiền</th>
                  <th className="px-5 py-4">Trạng thái</th>
                  <th className="px-5 py-4">Thời gian</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {history.length === 0 && <tr><td colSpan={5} className="px-5 py-8 text-center text-sm font-semibold text-slate-500">Chưa có giao dịch nào.</td></tr>}
                {history.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50/80">
                    <td className="whitespace-nowrap px-5 py-4 font-semibold text-slate-800">{t.transactionCode}</td>
                    <td className="whitespace-nowrap px-5 py-4 text-slate-700">{t.targetType === "FEE_PAYMENT" ? "Khoản phí" : "Hoá đơn"}</td>
                    <td className="whitespace-nowrap px-5 py-4 text-slate-700">{money(t.amount)}</td>
                    <td className="whitespace-nowrap px-5 py-4">{txStatusBadge(t.status)}</td>
                    <td className="whitespace-nowrap px-5 py-4 text-slate-500">{t.createdAt ? new Date(t.createdAt).toLocaleString("vi-VN") : "__"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}
