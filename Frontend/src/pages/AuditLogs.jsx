import { useCallback, useEffect, useState } from "react";
import { Badge, Pagination } from "../components/common";
import { SectionHeader } from "../components/layout/SectionHeader";
import { getAuditLogsAPI } from "../api/auditLogApi";

const PAGE_SIZE = 20;

// Màu badge theo loại hành động.
const actionTone = (action) => {
  switch (String(action || "").toUpperCase()) {
    case "CREATE":
      return "green";
    case "UPDATE":
      return "blue";
    case "DELETE":
      return "red";
    default:
      return "gray";
  }
};

// LocalDateTime backend trả về dạng chuỗi ISO ("2026-06-06T12:34:56") hoặc mảng [y,M,d,h,m,s].
const formatTimestamp = (ts) => {
  if (!ts) return "—";
  try {
    let date;
    if (Array.isArray(ts)) {
      const [y, mo, d, h = 0, mi = 0, s = 0] = ts;
      date = new Date(y, (mo || 1) - 1, d, h, mi, s);
    } else {
      date = new Date(ts);
    }
    if (Number.isNaN(date.getTime())) return String(ts);
    return date.toLocaleString("vi-VN");
  } catch {
    return String(ts);
  }
};

export function AuditLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const loadLogs = useCallback(async (targetPage = 1) => {
    setLoading(true);
    setLoadError("");
    const res = await getAuditLogsAPI({ page: targetPage - 1, size: PAGE_SIZE });
    if (res.success) {
      setLogs(res.data?.items || []);
      setTotal(res.data?.totalElements || 0);
      setPage(targetPage);
    } else {
      setLoadError(res.message || "Không tải được nhật ký hệ thống.");
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadLogs(1);
  }, [loadLogs]);

  return (
    <>
      <SectionHeader
        title="Lịch sử hệ thống"
        desc="Nhật ký các thao tác quản trị: tạo, cập nhật, xóa dữ liệu."
      />

      {loadError && (
        <div className="mb-5 rounded-xl bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 ring-1 ring-rose-200">
          {loadError}
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-5 py-4">Thời gian</th>
                <th className="px-5 py-4">Quản trị viên</th>
                <th className="px-5 py-4">Hành động</th>
                <th className="px-5 py-4">Đối tượng</th>
                <th className="px-5 py-4">Chi tiết</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={5} className="px-5 py-10 text-center text-slate-500">Đang tải nhật ký...</td></tr>
              ) : logs.length === 0 ? (
                <tr><td colSpan={5} className="px-5 py-10 text-center text-slate-500">Chưa có thao tác nào được ghi nhận</td></tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/80">
                    <td className="whitespace-nowrap px-5 py-4 text-slate-700">{formatTimestamp(log.timestamp)}</td>
                    <td className="whitespace-nowrap px-5 py-4 font-semibold text-slate-800">{log.adminUsername || "—"}</td>
                    <td className="whitespace-nowrap px-5 py-4"><Badge tone={actionTone(log.action)}>{log.action || "—"}</Badge></td>
                    <td className="whitespace-nowrap px-5 py-4 text-slate-700">{log.targetEntity || "—"}</td>
                    <td className="px-5 py-4 text-slate-600">{log.details || "—"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {!loading && total > 0 && (
          <div className="border-t border-slate-200">
            <Pagination page={page} total={total} pageSize={PAGE_SIZE} onPageChange={(p) => loadLogs(p)} />
          </div>
        )}
      </div>
    </>
  );
}
