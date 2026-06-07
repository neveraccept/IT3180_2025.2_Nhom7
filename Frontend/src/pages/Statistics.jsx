import { useState, useEffect, useCallback } from "react";
import { Download } from "lucide-react";
import { money } from "../utils/helpers";
import { Button, Card, Input, Select, Pagination } from "../components/common";
import { SectionHeader } from "../components/layout/SectionHeader";
import {
  getHouseholdStatisticsAPI,
  getResidentStatisticsAPI,
  getFeePeriodStatisticsAPI,
  exportHouseholdExcelAPI,
  exportHouseholdPdfAPI,
  exportResidentExcelAPI,
  exportResidentPdfAPI,
  exportFeePeriodExcelAPI,
  exportFeePeriodPdfAPI,
  exportTransactionExcelAPI,
  exportTransactionPdfAPI,
  downloadBlob,
} from "../api/reportApi";
import { listFeePeriodsAPI } from "../api/feeApi";
import { searchVnpayTransactionsAPI } from "../api/vnpayApi";

const REPORT_PAGE_SIZE = 20;

const reportLabels = {
  households: "Thống kê theo hộ",
  residents: "Thống kê dân cư",
  "fee-period": "Thống kê đợt thu",
  transactions: "Giao dịch online",
};

export function Statistics() {
  const [feePeriods, setFeePeriods] = useState([]);

  const [exporting, setExporting] = useState(false);
  const [toast, setToast] = useState(null);

  const [reportType, setReportType] = useState("households");
  const [selectedPeriodIds, setSelectedPeriodIds] = useState([]); // multi-select đợt thu
  const [format, setFormat] = useState("excel");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [reportLoading, setReportLoading] = useState(false);
  const [reportPage, setReportPage] = useState(1);
  const [reportResult, setReportResult] = useState(null);

  const showToast = useCallback((message, type = "success") => {
    setToast({ message, type });
    if (type !== "info") setTimeout(() => setToast(null), 3500);
  }, []);

  const buildReportTable = (type, data) => {
    if (type === "households") {
      return {
        title: reportLabels[type],
        columns: ["Căn hộ", "Chủ hộ", "Phải nộp", "Đã nộp", "Còn thiếu", "Số phiếu", "Chưa nộp"],
        rows: (data || []).map((h) => [
          h.apartmentCode || h.householdCode || "?",
          h.headName || "?",
          money(h.totalDue || 0),
          money(h.totalPaid || 0),
          money(h.outstanding || 0),
          h.paymentCount ?? 0,
          h.unpaidCount ?? 0,
        ]),
      };
    }

    if (type === "residents") {
      return {
        title: reportLabels[type],
        columns: ["Chỉ tiêu", "Giá trị"],
        rows: [
          ["Hộ đang hoạt động", data?.totalActiveHouseholds ?? 0],
          ["Nhân khẩu", data?.totalActiveResidents ?? 0],
          ["Thường trú", data?.permanentCount ?? 0],
          ["Tạm trú", data?.temporaryCount ?? 0],
          ["Tạm vắng", data?.absentCount ?? 0],
          ["Nam", data?.maleCount ?? 0],
          ["Nữ", data?.femaleCount ?? 0],
          ["Khác", data?.otherCount ?? 0],
        ],
      };
    }

    if (type === "fee-period") {
      return {
        title: `${reportLabels[type]}${data?.feePeriodName ? ` - ${data.feePeriodName}` : ""}`,
        columns: ["Chỉ tiêu", "Giá trị"],
        rows: [
          ["Tên đợt thu", data?.feePeriodName || "?"],
          ["Khoản thu", data?.feeName || "?"],
          ["Trạng thái", data?.periodStatus || "?"],
          ["Tổng số hộ", data?.totalHouseholds ?? 0],
          ["Đã nộp", data?.paidCount ?? 0],
          ["Chưa nộp", data?.unpaidCount ?? 0],
          ["Tổng phải thu", money(data?.totalDue || 0)],
          ["Đã thu", money(data?.totalCollected || 0)],
          ["Còn thiếu", money(data?.totalOutstanding || 0)],
          ["Tỉ lệ thu", `${Number(data?.collectionRate || 0).toFixed(1)}%`],
        ],
      };
    }

    return {
      title: reportLabels[type],
      columns: ["Mã giao dịch", "Hộ", "Nội dung", "Số tiền", "Trạng thái", "Tạo lúc", "Thanh toán lúc"],
      rows: (data?.items || data || []).map((t) => [
        t.transactionCode || `#${t.id}`,
        t.householdCode || t.householdId || "?",
        t.targetType || "?",
        money(t.amount || 0),
        t.status || "?",
        t.createdAt || "?",
        t.paidAt || t.vnpayPayDate || "?",
      ]),
    };
  };

  const handleApplyReport = async () => {
    if (reportType === "fee-period" && selectedPeriodIds.length === 0) {
      showToast("Vui lòng chọn ít nhất một đợt thu.", "error");
      return;
    }

    setReportLoading(true);
    setReportPage(1);
    const range = { from: dateFrom || undefined, to: dateTo || undefined };
    let res;

    if (reportType === "households") {
      res = await getHouseholdStatisticsAPI(range);
    } else if (reportType === "residents") {
      res = await getResidentStatisticsAPI(range);
    } else if (reportType === "fee-period") {
      res = await getFeePeriodStatisticsAPI(selectedPeriodIds, range);
    } else {
      res = await searchVnpayTransactionsAPI({
        status: statusFilter || undefined,
        fromDate: dateFrom || undefined,
        toDate: dateTo || undefined,
        page: 0,
        size: 1000,
      });
    }

    setReportLoading(false);
    if (res.success) {
      setReportResult(buildReportTable(reportType, res.data));
    } else {
      setReportResult(null);
      showToast(res.message || "Không tải được thông tin báo cáo.", "error");
    }
  };

  useEffect(() => {
    if (reportType === "fee-period" && feePeriods.length === 0) {
      listFeePeriodsAPI().then((res) => {
        if (res.success) setFeePeriods(res.data?.items || []);
      });
    }
  }, [reportType, feePeriods.length]);

  const handleExport = async () => {
    if (reportType === "fee-period" && selectedPeriodIds.length === 0) {
      showToast("Vui lòng chọn ít nhất một đợt thu.", "error");
      return;
    }

    setExporting(true);
    setToast({ message: "Đang xuất báo cáo...", type: "info" });

    const isPdf = format === "pdf";
    const ext = isPdf ? "pdf" : "xlsx";
    let res;
    let filename;

    try {
      if (reportType === "households") {
        res = isPdf ? await exportHouseholdPdfAPI() : await exportHouseholdExcelAPI();
        filename = `thong-ke-theo-ho.${ext}`;
      } else if (reportType === "residents") {
        res = isPdf ? await exportResidentPdfAPI() : await exportResidentExcelAPI();
        filename = `thong-ke-dan-cu.${ext}`;
      } else if (reportType === "fee-period") {
        res = isPdf
          ? await exportFeePeriodPdfAPI(selectedPeriodIds)
          : await exportFeePeriodExcelAPI(selectedPeriodIds);
        filename = `tinh-trang-dot-thu.${ext}`;
      } else {
        const params = {
          status: statusFilter || undefined,
          from: dateFrom || undefined,
          to: dateTo || undefined,
        };
        res = isPdf ? await exportTransactionPdfAPI(params) : await exportTransactionExcelAPI(params);
        filename = `giao-dich-online.${ext}`;
      }

      if (res?.success && res.data instanceof Blob) {
        downloadBlob(res.data, filename);
        showToast("Tải báo cáo thành công!", "success");
      } else {
        showToast(res?.message || "Xuất báo cáo thất bại.", "error");
      }
    } catch {
      showToast("Lỗi không xác định khi xuất báo cáo.", "error");
    } finally {
      setExporting(false);
    }
  };

  const needsDates = reportType === "transactions";

  return (
    <>
      {toast && (
        <div
          className={`fixed right-4 top-4 z-50 rounded-2xl px-5 py-3 text-sm font-semibold shadow-xl transition ${
            toast.type === "success"
              ? "bg-emerald-600 text-white"
              : toast.type === "error"
              ? "bg-rose-600 text-white"
              : "bg-sky-600 text-white"
          }`}
        >
          {toast.message}
        </div>
      )}

      <SectionHeader
        title="Trình xuất báo cáo"
        desc="Thiết lập bộ lọc, xem trước dữ liệu và xuất báo cáo Excel/PDF."
      />

      <Card className="mb-6">
        <div className="grid gap-4 md:grid-cols-2">
          <Select
            label="Loại báo cáo"
            value={reportType}
            onChange={(e) => {
              setReportType(e.target.value);
              setSelectedPeriodIds([]);
              setReportPage(1);
              setReportResult(null);
            }}
          >
            <option value="households">Thống kê theo hộ</option>
            <option value="residents">Thống kê dân cư</option>
            <option value="fee-period">Thống kê đợt thu</option>
            <option value="transactions">Giao dịch online</option>
          </Select>

          <Select label="Định dạng" value={format} onChange={(e) => setFormat(e.target.value)}>
            <option value="excel">Excel (.xlsx)</option>
            <option value="pdf">PDF (.pdf)</option>
          </Select>
        </div>

        {reportType === "fee-period" && (
          <div className="mt-4">
            <div className="mb-1.5 flex items-center justify-between">
              <span className="text-sm font-semibold text-slate-700">
                Đợt thu (chọn một hoặc nhiều)
              </span>
              {feePeriods.length > 0 && (
                <button
                  type="button"
                  className="text-xs font-bold text-sky-600 hover:underline"
                  onClick={() =>
                    setSelectedPeriodIds(
                      selectedPeriodIds.length === feePeriods.length
                        ? []
                        : feePeriods.map((p) => String(p.id))
                    )
                  }
                >
                  {selectedPeriodIds.length === feePeriods.length ? "Bỏ chọn tất cả" : "Chọn tất cả"}
                </button>
              )}
            </div>
            <div className="max-h-48 space-y-1 overflow-y-auto rounded-xl border border-slate-200 bg-white p-3">
              {feePeriods.length === 0 ? (
                <p className="px-1 py-2 text-sm text-slate-400">Đang tải danh sách đợt thu...</p>
              ) : (
                feePeriods.map((p) => {
                  const id = String(p.id);
                  const checked = selectedPeriodIds.includes(id);
                  return (
                    <label
                      key={p.id}
                      className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
                    >
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-200"
                        checked={checked}
                        onChange={() =>
                          setSelectedPeriodIds((prev) =>
                            prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
                          )
                        }
                      />
                      <span>{p.name}</span>
                    </label>
                  );
                })
              )}
            </div>
            {selectedPeriodIds.length > 0 && (
              <p className="mt-1.5 text-xs font-semibold text-slate-500">
                Đã chọn {selectedPeriodIds.length} đợt thu.
              </p>
            )}
          </div>
        )}

        {needsDates && (
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            <Input label="Từ ngày" type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
            <Input label="Đến ngày" type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
            <Select label="Trạng thái" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="">Tất cả</option>
              <option value="SUCCESS">Thành công</option>
              <option value="PENDING">Đang chờ</option>
              <option value="FAILED">Thất bại</option>
              <option value="CANCELLED">Đã hủy</option>
            </Select>
          </div>
        )}

        <div className="mt-5 flex justify-end gap-3">
          <Button variant="secondary" onClick={handleApplyReport} disabled={reportLoading}>
            {reportLoading ? "Đang tải..." : "Áp dụng"}
          </Button>
          <Button onClick={handleExport} disabled={exporting}>
            <Download className="h-4 w-4" />
            {exporting ? "Đang xuất..." : format === "pdf" ? "Xuất PDF" : "Xuất Excel"}
          </Button>
        </div>
      </Card>

      <Card className="mb-6 !p-0">
        {reportResult ? (
          <>
            <div className="border-b border-slate-200 px-5 py-5">
              <h3 className="font-black text-slate-900">{reportResult.title}</h3>
              {reportResult.summary && (
                <p className="mt-1 text-sm font-semibold text-slate-500">{reportResult.summary}</p>
              )}
            </div>
            {reportResult.rows.length === 0 ? (
              <p className="px-5 py-8 text-center text-sm font-semibold text-slate-500">
                Không có dữ liệu phù hợp.
              </p>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-slate-200 text-sm">
                    <thead className="bg-slate-50 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
                      <tr>
                        {reportResult.columns.map((column) => (
                          <th key={column} className="px-5 py-4">
                            {column}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {reportResult.rows
                        .slice((reportPage - 1) * REPORT_PAGE_SIZE, reportPage * REPORT_PAGE_SIZE)
                        .map((row, rowIndex) => (
                          <tr key={rowIndex} className="hover:bg-slate-50/80">
                            {row.map((cell, cellIndex) => (
                              <td key={cellIndex} className="whitespace-nowrap px-5 py-4 text-slate-700">
                                {cell}
                              </td>
                            ))}
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
                <div className="border-t border-slate-200">
                  <Pagination
                    page={reportPage}
                    total={reportResult.rows.length}
                    pageSize={REPORT_PAGE_SIZE}
                    onPageChange={setReportPage}
                  />
                </div>
              </>
            )}
          </>
        ) : (
          <div className="px-5 py-10 text-center text-sm font-semibold text-slate-500">
            Vui lòng chọn loại báo cáo, thiết lập bộ lọc và nhấn 'Áp dụng' để xem trước dữ liệu.
          </div>
        )}
      </Card>
    </>
  );
}
