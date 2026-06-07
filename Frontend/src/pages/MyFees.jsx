import { useState, useEffect, useCallback, useMemo } from "react";
import { CreditCard } from "lucide-react";
import { money } from "../utils/helpers";
import { Badge, Button, Card, Pagination, Select, StatusBadge } from "../components/common";
import { SectionHeader } from "../components/layout/SectionHeader";
import { listMyHouseholdPaymentsAPI } from "../api/paymentApi";
import { listMyUtilityBillsAPI } from "../api/utilityApi";
import { listMyVnpayHistoryAPI, createVnpayUrlAPI, VNPAY_TARGET } from "../api/vnpayApi";

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

const transactionTypeLabel = (type) => {
  if (type === VNPAY_TARGET.MIXED_PAYMENT_BATCH) return "Nhiều mục";
  if (type === VNPAY_TARGET.FEE_PAYMENT_BATCH) return "Nhiều khoản phí";
  if (type === VNPAY_TARGET.FEE_PAYMENT) return "Khoản phí";
  return "Hoá đơn";
};

const HISTORY_PAGE_SIZE = 10;

export function MyFees() {
  const [payments, setPayments] = useState([]);
  const [bills, setBills] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState("");
  const [filters, setFilters] = useState({ status: "ALL" });
  const [historyFilter, setHistoryFilter] = useState("ALL");
  const [historyPage, setHistoryPage] = useState(1);
  const [payingId, setPayingId] = useState(null);
  const [donationAmounts, setDonationAmounts] = useState({});
  const [selectedKeys, setSelectedKeys] = useState([]);

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

  useEffect(() => {
    setHistoryPage(1);
  }, [historyFilter]);

  const feeRows = useMemo(() => payments.map((p) => ({
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
  })), [payments]);

  const billRows = useMemo(() => bills.map((b) => ({
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
  })), [bills]);

  const visibleRows = useMemo(
    () => [...feeRows.filter((r) => String(r.feePeriodStatus).toUpperCase() !== "CLOSED"), ...billRows],
    [feeRows, billRows]
  );

  const allRows = visibleRows.filter((r) => filters.status === "ALL" || r.status === filters.status);
  const selectableRows = allRows.filter(
    (r) => r.status === "UNPAID" && String(r.feePeriodStatus).toUpperCase() !== "CLOSED"
  );
  const selectedRows = selectableRows.filter((r) => selectedKeys.includes(r.key));
  const allSelectableChecked = selectableRows.length > 0 && selectableRows.every((r) => selectedKeys.includes(r.key));

  const effectiveAmount = (row) => {
    if (row.feeType === "DONATION" && row.status === "UNPAID") {
      return Number(donationAmounts[row.key] || 0);
    }
    return row.amount;
  };

  const selectedTotal = selectedRows.reduce((sum, row) => sum + effectiveAmount(row), 0);

  const summary = visibleRows.reduce(
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

  const setDonationAmount = (key, value) => {
    setDonationAmounts((prev) => ({ ...prev, [key]: value }));
  };

  const toggleRow = (key) => {
    setSelectedKeys((prev) => prev.includes(key) ? prev.filter((item) => item !== key) : [...prev, key]);
  };

  const toggleAll = () => {
    setSelectedKeys((prev) => {
      const selectableKeys = selectableRows.map((r) => r.key);
      if (selectableKeys.length > 0 && selectableKeys.every((key) => prev.includes(key))) {
        return prev.filter((key) => !selectableKeys.includes(key));
      }
      return Array.from(new Set([...prev, ...selectableKeys]));
    });
  };

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
      window.location.href = res.data.paymentUrl;
      return;
    }
    setPayingId(null);
    setPageError(res.message || "Không tạo được liên kết thanh toán VNPay");
  };

  const paySelectedFees = async () => {
    if (selectedRows.length === 0) {
      setPageError("Vui lòng chọn ít nhất một khoản phí chưa nộp.");
      return;
    }
    if (selectedRows.length === 1) {
      const row = selectedRows[0];
      await payWithVnpay(row.targetType, row.targetId, row.key, row.feeType);
      return;
    }
    const selectedFeeRows = selectedRows.filter((row) => row.targetType === VNPAY_TARGET.FEE_PAYMENT);
    const selectedBillRows = selectedRows.filter((row) => row.targetType === VNPAY_TARGET.UTILITY_BILL);
    const customAmounts = {};
    for (const row of selectedFeeRows) {
      if (row.feeType === "DONATION") {
        const amount = Number(donationAmounts[row.key]);
        if (!(amount > 0)) {
          setPageError("Vui lòng nhập số tiền đóng góp lớn hơn 0 cho các khoản tự nguyện đã chọn.");
          return;
        }
        customAmounts[row.targetId] = amount;
      }
    }

    setPayingId("BATCH");
    setPageError("");
    const res = await createVnpayUrlAPI({
      targetType: selectedBillRows.length > 0 ? VNPAY_TARGET.MIXED_PAYMENT_BATCH : VNPAY_TARGET.FEE_PAYMENT_BATCH,
      targetIds: selectedFeeRows.map((r) => r.targetId),
      utilityBillIds: selectedBillRows.map((r) => r.targetId),
      customAmounts,
    });
    if (res.success && res.data?.paymentUrl) {
      window.location.href = res.data.paymentUrl;
      return;
    }
    setPayingId(null);
    setPageError(res.message || "Không tạo được liên kết thanh toán VNPay");
  };

  const filteredHistory = history.filter((t) => {
    if (historyFilter === "SUCCESS") return t.status === "SUCCESS";
    if (historyFilter === "PENDING") return t.status === "PENDING";
    if (historyFilter === "FAILED") return t.status === "FAILED" || t.status === "CANCELLED";
    return true;
  });
  const paginatedHistory = filteredHistory.slice(
    (historyPage - 1) * HISTORY_PAGE_SIZE,
    historyPage * HISTORY_PAGE_SIZE
  );

  return (
    <>
      <SectionHeader
        title="Khoản phí của tôi"
        desc="Các khoản phí và hoá đơn điện/nước/internet của hộ bạn. Có thể chọn nhiều khoản phí để thanh toán VNPay trong một lần."
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
        <div className="grid gap-3 md:grid-cols-[minmax(180px,1fr)_auto] md:items-end">
          <Select label="Trạng thái" value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })}>
            <option value="ALL">Tất cả</option>
            <option value="PAID">Đã nộp</option>
            <option value="UNPAID">Chưa nộp</option>
          </Select>
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm font-semibold text-slate-600">
              Đã chọn {selectedRows.length} mục • {money(selectedTotal)}
            </span>
            <Button onClick={paySelectedFees} disabled={selectedRows.length === 0 || payingId === "BATCH"}>
              <CreditCard className="h-4 w-4" /> {payingId === "BATCH" ? "Đang chuyển..." : "Thanh toán mục đã chọn"}
            </Button>
          </div>
        </div>
      </Card>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="w-12 px-5 py-4">
                  <input
                    aria-label="Chọn tất cả khoản phí có thể thanh toán"
                    type="checkbox"
                    checked={allSelectableChecked}
                    onChange={toggleAll}
                    className="h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                  />
                </th>
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
              {loading && <tr><td colSpan={8} className="px-5 py-10 text-center text-sm font-semibold text-slate-500">Đang tải dữ liệu...</td></tr>}
              {!loading && allRows.length === 0 && <tr><td colSpan={8} className="px-5 py-10 text-center text-sm font-semibold text-slate-500">Không có khoản phí nào phù hợp với bộ lọc.</td></tr>}
              {!loading && allRows.map((r) => {
                const canSelect = selectableRows.some((row) => row.key === r.key);
                return (
                  <tr key={r.key} className="hover:bg-slate-50/80">
                    <td className="px-5 py-4">
                      {canSelect && (
                        <input
                          aria-label={`Chọn ${r.name}`}
                          type="checkbox"
                          checked={selectedKeys.includes(r.key)}
                          onChange={() => toggleRow(r.key)}
                          className="h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                        />
                      )}
                    </td>
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
                          onChange={(e) => setDonationAmount(r.key, e.target.value)}
                        />
                      ) : (
                        money(r.amount)
                      )}
                    </td>
                    <td className="whitespace-nowrap px-5 py-4"><StatusBadge status={r.status} /></td>
                    <td className="px-5 py-4 text-right">
                      {r.status === "UNPAID" ? (
                        <Button onClick={() => payWithVnpay(r.targetType, r.targetId, r.key, r.feeType)} disabled={payingId === r.key || payingId === "BATCH"}>
                          <CreditCard className="h-4 w-4" /> {payingId === r.key ? "Đang chuyển..." : "Thanh toán VNPay"}
                        </Button>
                      ) : (
                        <span className="font-semibold text-emerald-600">Đã thanh toán</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-8">
        <SectionHeader title="Lịch sử thanh toán VNPay" desc="Các giao dịch online của hộ bạn." />
        <Card className="mb-4">
          <div className="grid gap-3 md:max-w-sm">
            <Select label="Lọc lịch sử" value={historyFilter} onChange={(e) => setHistoryFilter(e.target.value)}>
              <option value="ALL">Tất cả giao dịch</option>
              <option value="SUCCESS">Đã thanh toán thành công</option>
              <option value="PENDING">Đang chờ</option>
              <option value="FAILED">Thất bại</option>
            </Select>
          </div>
        </Card>
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
                {filteredHistory.length === 0 && <tr><td colSpan={5} className="px-5 py-8 text-center text-sm font-semibold text-slate-500">Chưa có giao dịch nào phù hợp.</td></tr>}
                {paginatedHistory.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50/80">
                    <td className="whitespace-nowrap px-5 py-4 font-semibold text-slate-800">{t.transactionCode}</td>
                    <td className="whitespace-nowrap px-5 py-4 text-slate-700">{transactionTypeLabel(t.targetType)}</td>
                    <td className="whitespace-nowrap px-5 py-4 text-slate-700">{money(t.amount)}</td>
                    <td className="whitespace-nowrap px-5 py-4">{txStatusBadge(t.status)}</td>
                    <td className="whitespace-nowrap px-5 py-4 text-slate-500">{t.createdAt ? new Date(t.createdAt).toLocaleString("vi-VN") : "__"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination
            page={historyPage}
            total={filteredHistory.length}
            pageSize={HISTORY_PAGE_SIZE}
            onPageChange={setHistoryPage}
          />
        </div>
      </div>
    </>
  );
}
