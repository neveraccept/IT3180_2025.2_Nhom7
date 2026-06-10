import { Fragment, useState, useEffect, useCallback, useMemo } from "react";
import { CheckCircle2, ChevronDown, ChevronRight, CreditCard } from "lucide-react";
import { money } from "../utils/helpers";
import { Badge, Button, Card, Input, Pagination, Select, StatusBadge } from "../components/common";
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
const MY_FEES_PAGE_SIZE = 10;

const normalizeText = (value) =>
  String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

const extractMonthKey = (value) => {
  const text = String(value || "");
  const match = text.match(/(?:th[aá]ng\s*)?(\d{1,2})[/-](\d{4})/i);
  if (!match) return "";
  const month = Number(match[1]);
  if (month < 1 || month > 12) return "";
  return `${match[2]}-${String(month).padStart(2, "0")}`;
};

const monthLabel = (key) => {
  const [year, month] = String(key || "").split("-");
  return month && year ? `Tháng ${Number(month)}/${year}` : key;
};

const parseCsvIds = (value) =>
  String(value || "")
    .split(",")
    .map((id) => Number(id.trim()))
    .filter((id) => Number.isFinite(id) && id > 0);

const parseCsvAmounts = (value) =>
  String(value || "")
    .split(",")
    .map((amount) => Number(amount.trim()))
    .filter((amount) => Number.isFinite(amount));

export function MyFees() {
  const [payments, setPayments] = useState([]);
  const [bills, setBills] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState("");
  const [filters, setFilters] = useState({ status: "ALL", keyword: "", month: "ALL", feeType: "ALL" });
  const [myFeesPage, setMyFeesPage] = useState(1);
  const [historyFilter, setHistoryFilter] = useState("ALL");
  const [historyPage, setHistoryPage] = useState(1);
  const [payingId, setPayingId] = useState(null);
  const [donationAmounts, setDonationAmounts] = useState({});
  const [selectedKeys, setSelectedKeys] = useState([]);
  const [expandedHistoryKeys, setExpandedHistoryKeys] = useState([]);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setPageError("");
    const [pRes, bRes, hRes] = await Promise.all([
      listMyHouseholdPaymentsAPI(),
      listMyUtilityBillsAPI(),
      listMyVnpayHistoryAPI(),
    ]);
    if (pRes.success) setPayments(pRes.data?.items || []);
    else setPageError(pRes.message || "Không tải được danh sách thanh toán của hộ");
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

  useEffect(() => {
    setMyFeesPage(1);
  }, [filters]);

  const feeRows = useMemo(() => payments.map((p) => ({
    key: `FEE-${p.id}`,
    targetType: VNPAY_TARGET.FEE_PAYMENT,
    targetId: p.id,
    group: p.feeType === "DONATION" ? "Đóng góp" : "Khoản phí",
    name: p.feeName || p.feePeriodName || "Khoản phí",
    period: p.feePeriodName || "__",
    amount: Number(p.amountDue || 0),
    feeType: p.feeType || "MANDATORY",
    feePeriodStatus: p.feePeriodStatus || "OPEN",
    monthKey: extractMonthKey(p.feePeriodName),
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
    monthKey: b.month && b.year ? `${b.year}-${String(b.month).padStart(2, "0")}` : "",
    status: b.status === "PAID" ? "PAID" : "UNPAID",
  })), [bills]);

  const feeRowsById = useMemo(
    () => new Map(feeRows.map((row) => [Number(row.targetId), row])),
    [feeRows]
  );

  const billRowsById = useMemo(
    () => new Map(billRows.map((row) => [Number(row.targetId), row])),
    [billRows]
  );

  const visibleRows = useMemo(
    () => [...feeRows.filter((r) => String(r.feePeriodStatus).toUpperCase() !== "CLOSED"), ...billRows],
    [feeRows, billRows]
  );

  const monthOptions = useMemo(
    () => Array.from(new Set(visibleRows.map((r) => r.monthKey).filter(Boolean))).sort().reverse(),
    [visibleRows]
  );

  const allRows = visibleRows.filter((r) => {
    const keyword = normalizeText(filters.keyword);
    const matchesKeyword = !keyword || normalizeText(`${r.name} ${r.period} ${r.group}`).includes(keyword);
    const matchesStatus = filters.status === "ALL" || r.status === filters.status;
    const matchesMonth = filters.month === "ALL" || r.monthKey === filters.month;
    const matchesType = filters.feeType === "ALL" || r.feeType === filters.feeType;
    return matchesKeyword && matchesStatus && matchesMonth && matchesType;
  });
  const selectableRows = allRows.filter(
    (r) => r.status === "UNPAID" && String(r.feePeriodStatus).toUpperCase() !== "CLOSED"
  );
  const selectedRows = selectableRows.filter((r) => selectedKeys.includes(r.key));
  const allSelectableChecked = selectableRows.length > 0 && selectableRows.every((r) => selectedKeys.includes(r.key));
  const paginatedRows = allRows.slice(
    (myFeesPage - 1) * MY_FEES_PAGE_SIZE,
    myFeesPage * MY_FEES_PAGE_SIZE
  );

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
      setPageError("Vui lòng chọn ít nhất một mục chưa thanh toán.");
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
          setPageError("Vui lòng nhập số tiền đóng góp lớn hơn 0 cho các khoản đóng góp đã chọn.");
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

  const allHistoryRows = history.flatMap((t) => {
    const baseRow = (line, index) => ({
      ...t,
      lineKey: `${t.id}-${line.type}-${line.id ?? index}`,
      lineType: line.type,
      lineName: line.name,
      lineAmount: Number(line.amount || 0),
    });

    if (t.targetType === VNPAY_TARGET.FEE_PAYMENT_BATCH || t.targetType === VNPAY_TARGET.MIXED_PAYMENT_BATCH) {
      const feeIds = parseCsvIds(t.targetIds);
      const utilityIds = parseCsvIds(t.utilityBillIds);
      const feeAmounts = parseCsvAmounts(t.targetAmounts);
      const feeLines = feeIds.map((id, index) => {
        const row = feeRowsById.get(id);
        return baseRow({
          id,
          type: VNPAY_TARGET.FEE_PAYMENT,
          name: row ? `${row.name}${row.period ? ` - ${row.period}` : ""}` : `Khoản phí #${id}`,
          amount: feeAmounts[index] ?? row?.amount ?? 0,
        }, index);
      });
      const utilityLines = utilityIds.map((id, index) => {
        const row = billRowsById.get(id);
        return baseRow({
          id,
          type: VNPAY_TARGET.UTILITY_BILL,
          name: row ? `${row.name}${row.period ? ` - ${row.period}` : ""}` : `Hoá đơn #${id}`,
          amount: row?.amount ?? 0,
        }, feeIds.length + index);
      });
      return [...feeLines, ...utilityLines];
    }

    const sourceRow = t.targetType === VNPAY_TARGET.FEE_PAYMENT
      ? feeRowsById.get(Number(t.targetId))
      : billRowsById.get(Number(t.targetId));
    return [baseRow({
      id: t.targetId,
      type: t.targetType,
      name: sourceRow ? `${sourceRow.name}${sourceRow.period ? ` - ${sourceRow.period}` : ""}` : `#${t.targetId}`,
      amount: t.amount,
    }, 0)];
  });

  const groupedAllHistoryRows = Array.from(
    allHistoryRows
      .reduce((map, row) => {
        const key = row.transactionCode || `TX-${row.id}`;
        const current = map.get(key) || {
          ...row,
          rowKey: `${row.id}-${key}`,
          lines: [],
        };
        current.lines.push({
          key: row.lineKey,
          type: row.lineType,
          name: row.lineName,
          amount: row.lineAmount,
        });
        map.set(key, current);
        return map;
      }, new Map())
      .values()
  ).map((row) => {
    const fallbackAmount = row.lines.reduce((sum, line) => sum + Number(line.amount || 0), 0);
    return {
      ...row,
      summaryType: row.lines.length > 1 ? `Thanh toán gộp (${row.lines.length} khoản)` : transactionTypeLabel(row.lines[0]?.type),
      summaryName: row.lines.length > 1 ? row.lines.map((line) => line.name).join(", ") : row.lines[0]?.name || "__",
      summaryAmount: Number(row.amount || fallbackAmount || 0),
    };
  });

  const groupedHistoryRows = groupedAllHistoryRows.filter((t) => {
    if (historyFilter === "SUCCESS") return t.status === "SUCCESS";
    if (historyFilter === "PENDING") return t.status === "PENDING";
    if (historyFilter === "FAILED") return t.status === "FAILED" || t.status === "CANCELLED";
    return true;
  });
  const paginatedGroupedHistory = groupedHistoryRows.slice(
    (historyPage - 1) * HISTORY_PAGE_SIZE,
    historyPage * HISTORY_PAGE_SIZE
  );

  const toggleHistory = (key) => {
    setExpandedHistoryKeys((prev) => prev.includes(key) ? prev.filter((item) => item !== key) : [...prev, key]);
  };

  return (
    <>
      <SectionHeader
        title="Thanh toán của tôi"
      />

      {pageError && (
        <div className="mb-5 rounded-xl bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 ring-1 ring-rose-200">{pageError}</div>
      )}

      <div className="mb-5 grid gap-4 md:grid-cols-3">
        <Card><p className="text-sm font-semibold text-slate-500">Cần thanh toán</p><p className="mt-2 text-2xl font-black text-rose-700">{money(summary.totalDue)}</p></Card>
        <Card><p className="text-sm font-semibold text-slate-500">Đã thanh toán</p><p className="mt-2 text-2xl font-black text-emerald-700">{money(summary.totalPaid)}</p></Card>
        <Card><p className="text-sm font-semibold text-slate-500">Mục đang mở</p><p className="mt-2 text-2xl font-black text-slate-900">{summary.unpaid}</p></Card>
      </div>

      <Card className="mb-5">
        <div className="grid gap-3 lg:grid-cols-[minmax(180px,1.5fr)_minmax(150px,1fr)_minmax(150px,1fr)_minmax(150px,1fr)_auto] lg:items-end">
          <Input
            label="Tìm theo tên"
            placeholder="Nhập tên phí, hóa đơn hoặc đóng góp"
            value={filters.keyword}
            onChange={(e) => setFilters({ ...filters, keyword: e.target.value })}
          />
          <Select label="Trạng thái" value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })}>
            <option value="ALL">Tất cả</option>
            <option value="PAID">Đã nộp</option>
            <option value="UNPAID">Chưa nộp</option>
          </Select>
          <Select label="Tháng" value={filters.month} onChange={(e) => setFilters({ ...filters, month: e.target.value })}>
            <option value="ALL">Tất cả</option>
            {monthOptions.map((key) => (
              <option key={key} value={key}>{monthLabel(key)}</option>
            ))}
          </Select>
          <Select label="Nhóm thanh toán" value={filters.feeType} onChange={(e) => setFilters({ ...filters, feeType: e.target.value })}>
            <option value="ALL">Tất cả</option>
            <option value="MANDATORY">Phí bắt buộc</option>
            <option value="DONATION">Đóng góp tự nguyện</option>
            <option value="UTILITY">Hoá đơn</option>
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
                    disabled={selectableRows.length === 0}
                    onChange={toggleAll}
                    className="h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500 disabled:cursor-not-allowed disabled:opacity-40"
                  />
                </th>
                <th className="px-5 py-4">Nhóm</th>
                <th className="px-5 py-4">Nội dung</th>
                <th className="px-5 py-4">Loại khoản</th>
                <th className="px-5 py-4">Kỳ</th>
                <th className="px-5 py-4">Số tiền</th>
                <th className="px-5 py-4">Trạng thái</th>
                <th className="px-5 py-4 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading && <tr><td colSpan={8} className="px-5 py-10 text-center text-sm font-semibold text-slate-500">Đang tải dữ liệu...</td></tr>}
              {!loading && allRows.length === 0 && <tr><td colSpan={8} className="px-5 py-10 text-center text-sm font-semibold text-slate-500">Không có mục thanh toán nào phù hợp với bộ lọc.</td></tr>}
              {!loading && paginatedRows.map((r) => {
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
                        <span
                          className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 ring-1 ring-emerald-200"
                          title="Đã thanh toán"
                          aria-label="Đã thanh toán"
                        >
                          <CheckCircle2 className="h-5 w-5" />
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <Pagination
          page={myFeesPage}
          total={allRows.length}
          pageSize={MY_FEES_PAGE_SIZE}
          onPageChange={setMyFeesPage}
        />
      </div>

      <div className="mt-8">
        <SectionHeader title="Lịch sử thanh toán VNPay" />
        <Card className="mb-4">
          <div className="flex flex-wrap gap-2">
            {[
              { key: "ALL", label: `Tất cả (${groupedAllHistoryRows.length})` },
              { key: "SUCCESS", label: `Thành công (${groupedAllHistoryRows.filter((t) => t.status === "SUCCESS").length})` },
              { key: "PENDING", label: `Đang chờ (${groupedAllHistoryRows.filter((t) => t.status === "PENDING").length})` },
              { key: "FAILED", label: `Thất bại/Huỷ (${groupedAllHistoryRows.filter((t) => t.status === "FAILED" || t.status === "CANCELLED").length})` },
            ].map((f) => (
              <button
                key={f.key}
                onClick={() => setHistoryFilter(f.key)}
                className={`rounded-full px-4 py-2 text-sm font-semibold ring-1 transition ${
                  historyFilter === f.key
                    ? "bg-sky-600 text-white ring-sky-600"
                    : "bg-white text-slate-600 ring-slate-200 hover:bg-slate-50"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </Card>
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="w-12 px-5 py-4"></th>
                  <th className="px-5 py-4">Mã giao dịch</th>
                  <th className="px-5 py-4">Loại</th>
                  <th className="px-5 py-4">Nội dung</th>
                  <th className="px-5 py-4">Số tiền</th>
                  <th className="px-5 py-4">Trạng thái</th>
                  <th className="px-5 py-4">Thời gian</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {groupedHistoryRows.length === 0 && <tr><td colSpan={7} className="px-5 py-8 text-center text-sm font-semibold text-slate-500">Chưa có giao dịch nào phù hợp.</td></tr>}
                {paginatedGroupedHistory.map((t) => {
                  const expanded = expandedHistoryKeys.includes(t.rowKey);
                  const canExpand = t.lines.length > 1;
                  return (
                    <Fragment key={t.rowKey}>
                      <tr className="hover:bg-slate-50/80">
                        <td className="px-5 py-4">
                          {canExpand && (
                            <button
                              type="button"
                              onClick={() => toggleHistory(t.rowKey)}
                              className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 ring-1 ring-slate-200 transition hover:bg-slate-50 hover:text-slate-800"
                              aria-label={expanded ? "Thu gọn chi tiết" : "Mở chi tiết"}
                            >
                              {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                            </button>
                          )}
                        </td>
                        <td className="whitespace-nowrap px-5 py-4 font-semibold text-slate-800">{t.transactionCode}</td>
                        <td className="whitespace-nowrap px-5 py-4 text-slate-700">{t.summaryType}</td>
                        <td className="max-w-xl px-5 py-4 font-semibold text-slate-800">
                          <span className="line-clamp-2">{t.summaryName}</span>
                        </td>
                        <td className="whitespace-nowrap px-5 py-4 font-bold text-slate-900">{money(t.summaryAmount)}</td>
                        <td className="whitespace-nowrap px-5 py-4">{txStatusBadge(t.status)}</td>
                        <td className="whitespace-nowrap px-5 py-4 text-slate-500">{t.createdAt ? new Date(t.createdAt).toLocaleString("vi-VN") : "__"}</td>
                      </tr>
                      {expanded && t.lines.map((line) => (
                        <tr key={line.key} className="bg-slate-50/70">
                          <td className="px-5 py-3"></td>
                          <td className="px-5 py-3"></td>
                          <td className="whitespace-nowrap px-5 py-3 text-slate-600">{transactionTypeLabel(line.type)}</td>
                          <td className="px-5 py-3 text-sm font-semibold text-slate-700">{line.name}</td>
                          <td className="whitespace-nowrap px-5 py-3 font-semibold text-slate-700">{money(line.amount)}</td>
                          <td className="px-5 py-3"></td>
                          <td className="px-5 py-3"></td>
                        </tr>
                      ))}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
          <Pagination
            page={historyPage}
            total={groupedHistoryRows.length}
            pageSize={HISTORY_PAGE_SIZE}
            onPageChange={setHistoryPage}
          />
        </div>
      </div>
    </>
  );
}
