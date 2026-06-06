import { useState, useEffect, useCallback } from "react";
import { Download } from "lucide-react";
import { money } from "../utils/helpers";
import { Button, Card, Input, Select, StatusBadge } from "../components/common";
import { SectionHeader } from "../components/layout/SectionHeader";
import {
  getHouseholdStatisticsAPI,
  getResidentStatisticsAPI,
  exportHouseholdExcelAPI,
  exportHouseholdPdfAPI,
  exportResidentExcelAPI,
  exportResidentPdfAPI,
  exportFeePeriodExcelAPI,
  exportFeePeriodPdfAPI,
  exportDonationExcelAPI,
  exportDonationPdfAPI,
  exportTransactionExcelAPI,
  exportTransactionPdfAPI,
  downloadBlob,
} from "../api/reportApi";
import { listFeePeriodsAPI } from "../api/feeApi";

// ============================================================
//  Module 10 — Thống kê & xuất báo cáo (ADMIN only).
//  Nguồn dữ liệu: ReportController /api/reports (Spring Boot).
//  Giữ nguyên UI/Tailwind; thay toàn bộ logic mock bằng API thật.
// ============================================================
export function Statistics() {
  // Dữ liệu thống kê
  const [households, setHouseholds] = useState([]);
  const [residentStats, setResidentStats] = useState(null);
  const [feePeriods, setFeePeriods] = useState([]);
  const [loading, setLoading] = useState(true);

  // Trạng thái xuất file
  const [exporting, setExporting] = useState(false);
  const [toast, setToast] = useState(null); // { message, type: 'success'|'error'|'info' }

  // Bộ lọc xuất báo cáo
  const [reportType, setReportType] = useState("households");
  const [selectedPeriodId, setSelectedPeriodId] = useState("");
  const [format, setFormat] = useState("excel");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  // ---- Toast helper ----
  const showToast = useCallback((message, type = "success") => {
    setToast({ message, type });
    if (type !== "info") setTimeout(() => setToast(null), 3500);
  }, []);

  // ---- Tải thống kê tổng hợp (có thể lọc theo khoảng ngày) ----
  const loadStats = useCallback((range = {}) => {
    setLoading(true);
    Promise.all([getHouseholdStatisticsAPI(range), getResidentStatisticsAPI(range)])
      .then(([h, r]) => {
        if (h.success) setHouseholds(h.data || []);
        if (r.success) setResidentStats(r.data);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  const handleApplyStatFilter = () => loadStats({ from: dateFrom || undefined, to: dateTo || undefined });
  const handleResetStatFilter = () => {
    setDateFrom("");
    setDateTo("");
    loadStats();
  };

  // ---- Tải danh sách đợt thu khi cần ----
  useEffect(() => {
    if ((reportType === "fee-period" || reportType === "donation") && feePeriods.length === 0) {
      listFeePeriodsAPI().then((res) => {
        if (res.success) setFeePeriods(res.data?.items || []);
      });
    }
  }, [reportType]);

  // ---- Tính tổng từ danh sách hộ ----
  const totalDue = households.reduce((s, h) => s + Number(h.totalDue || 0), 0);
  const totalPaid = households.reduce((s, h) => s + Number(h.totalPaid || 0), 0);
  const totalOutstanding = households.reduce((s, h) => s + Number(h.outstanding || 0), 0);

  // ---- Xuất báo cáo ----
  const handleExport = async () => {
    if ((reportType === "fee-period" || reportType === "donation") && !selectedPeriodId) {
      showToast("Vui lòng chọn đợt thu.", "error");
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
          ? await exportFeePeriodPdfAPI(selectedPeriodId)
          : await exportFeePeriodExcelAPI(selectedPeriodId);
        filename = `tinh-trang-dot-thu-${selectedPeriodId}.${ext}`;
      } else if (reportType === "donation") {
        res = isPdf
          ? await exportDonationPdfAPI(selectedPeriodId)
          : await exportDonationExcelAPI(selectedPeriodId);
        filename = `dong-gop-dot-${selectedPeriodId}.${ext}`;
      } else {
        // transactions
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

  const needsPeriod = reportType === "fee-period" || reportType === "donation";
  const needsDates = reportType === "transactions";

  return (
    <>
      {/* Toast */}
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
        title="Thống kê và xuất file"
        desc="Thống kê tổng hợp và xuất báo cáo Excel/PDF cho quản trị viên."
      />

      {/* === Công cụ xuất báo cáo === */}
      <Card className="mb-6">
        <div className="grid gap-4 md:grid-cols-4">
          <Select
            label="Loại báo cáo"
            value={reportType}
            onChange={(e) => {
              setReportType(e.target.value);
              setSelectedPeriodId("");
            }}
          >
            <option value="households">Thống kê theo hộ</option>
            <option value="residents">Thống kê dân cư</option>
            <option value="fee-period">Thống kê đợt thu</option>
            <option value="donation">Khoản đóng góp</option>
            <option value="transactions">Giao dịch online</option>
          </Select>

          {needsPeriod && (
            <Select
              label="Đợt thu"
              value={selectedPeriodId}
              onChange={(e) => setSelectedPeriodId(e.target.value)}
            >
              <option value="">-- Chọn đợt thu --</option>
              {feePeriods.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </Select>
          )}

          {needsDates && (
            <>
              <Input
                label="Từ ngày"
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
              <Input
                label="Đến ngày"
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
              />
              <Select
                label="Trạng thái"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="">Tất cả</option>
                <option value="SUCCESS">Thành công</option>
                <option value="PENDING">Đang chờ</option>
                <option value="FAILED">Thất bại</option>
                <option value="CANCELLED">Đã huỷ</option>
              </Select>
            </>
          )}

          <Select
            label="Định dạng"
            value={format}
            onChange={(e) => setFormat(e.target.value)}
          >
            <option value="excel">Excel (.xlsx)</option>
            <option value="pdf">PDF (.pdf)</option>
          </Select>
        </div>

        <div className="mt-4 flex justify-end">
          <Button onClick={handleExport} disabled={exporting}>
            <Download className="h-4 w-4" />
            {exporting ? "Đang xuất..." : "Xuất báo cáo"}
          </Button>
        </div>
      </Card>

      {/* === Lọc thống kê theo thời gian === */}
      <Card className="mb-6">
        <h3 className="mb-1 text-base font-black text-slate-900">Lọc thống kê theo thời gian</h3>
        <p className="mb-4 text-sm text-slate-500">
          Áp dụng cho bảng tổng hợp theo hộ (theo ngày thanh toán) và thống kê dân cư (theo ngày chuyển vào của hộ).
        </p>
        <div className="grid items-end gap-4 md:grid-cols-4">
          <Input label="Từ ngày" type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
          <Input label="Đến ngày" type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
          <Button onClick={handleApplyStatFilter}>Áp dụng</Button>
          <Button variant="secondary" onClick={handleResetStatFilter}>Đặt lại</Button>
        </div>
      </Card>

      {/* === 3 thẻ tổng hợp thanh toán === */}
      <div className="mb-6 grid gap-4 md:grid-cols-3">
        <Card>
          <p className="text-sm font-semibold text-slate-500">Tổng phải thu</p>
          <p className="mt-2 text-3xl font-black">{loading ? "..." : money(totalDue)}</p>
        </Card>
        <Card>
          <p className="text-sm font-semibold text-slate-500">Đã thu</p>
          <p className="mt-2 text-3xl font-black text-emerald-700">{loading ? "..." : money(totalPaid)}</p>
        </Card>
        <Card>
          <p className="text-sm font-semibold text-slate-500">Còn thiếu</p>
          <p className="mt-2 text-3xl font-black text-rose-700">{loading ? "..." : money(totalOutstanding)}</p>
        </Card>
      </div>

      {/* === Bảng tổng hợp theo hộ === */}
      <Card className="mb-6">
        <h3 className="mb-4 text-lg font-black">Tổng hợp thanh toán theo hộ</h3>
        {loading ? (
          <p className="py-8 text-center text-sm text-slate-500">Đang tải...</p>
        ) : households.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-500">Chưa có dữ liệu.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-5 py-4">Căn hộ</th>
                  <th className="px-5 py-4">Chủ hộ</th>
                  <th className="px-5 py-4">Phải nộp</th>
                  <th className="px-5 py-4">Đã nộp</th>
                  <th className="px-5 py-4">Còn thiếu</th>
                  <th className="px-5 py-4">Trạng thái</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {households.map((h) => {
                  const fullyPaid =
                    Number(h.outstanding || 0) <= 0 && Number(h.totalDue || 0) > 0;
                  return (
                    <tr key={h.householdId} className="hover:bg-slate-50/80">
                      <td className="whitespace-nowrap px-5 py-4 font-semibold text-slate-800">
                        {h.apartmentCode || h.householdCode}
                      </td>
                      <td className="whitespace-nowrap px-5 py-4 text-slate-700">{h.headName}</td>
                      <td className="whitespace-nowrap px-5 py-4 text-slate-700">{money(h.totalDue)}</td>
                      <td className="whitespace-nowrap px-5 py-4 text-slate-700">{money(h.totalPaid)}</td>
                      <td className="whitespace-nowrap px-5 py-4 text-slate-700">{money(h.outstanding)}</td>
                      <td className="whitespace-nowrap px-5 py-4">
                        <StatusBadge status={fullyPaid ? "PAID" : "UNPAID"} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* === Thống kê dân cư === */}
      {residentStats && (
        <Card>
          <h3 className="mb-4 text-lg font-black">Thống kê dân cư</h3>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="rounded-2xl border border-slate-200 p-4">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Hộ đang hoạt động</p>
              <p className="mt-2 text-3xl font-black text-sky-700">{residentStats.totalActiveHouseholds}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 p-4">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Nhân khẩu</p>
              <p className="mt-2 text-3xl font-black text-slate-800">{residentStats.totalActiveResidents}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 p-4">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Tình trạng cư trú</p>
              <div className="mt-3 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-600">Thường trú</span>
                  <span className="font-bold text-slate-900">{residentStats.permanentCount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Tạm trú</span>
                  <span className="font-bold text-slate-900">{residentStats.temporaryCount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Tạm vắng</span>
                  <span className="font-bold text-slate-900">{residentStats.absentCount}</span>
                </div>
              </div>
            </div>
            <div className="rounded-2xl border border-slate-200 p-4">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Giới tính</p>
              <div className="mt-3 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-600">Nam</span>
                  <span className="font-bold text-slate-900">{residentStats.maleCount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Nữ</span>
                  <span className="font-bold text-slate-900">{residentStats.femaleCount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Khác</span>
                  <span className="font-bold text-slate-900">{residentStats.otherCount}</span>
                </div>
              </div>
            </div>
          </div>
        </Card>
      )}
    </>
  );
}
