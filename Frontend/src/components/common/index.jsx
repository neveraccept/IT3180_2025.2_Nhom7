import { ChevronLeft, ChevronRight } from "lucide-react";

export function Badge({ children, tone = "gray" }) {
  const tones = {
    green: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    blue: "bg-sky-50 text-sky-700 ring-sky-200",
    yellow: "bg-amber-50 text-amber-700 ring-amber-200",
    red: "bg-rose-50 text-rose-700 ring-rose-200",
    gray: "bg-slate-100 text-slate-700 ring-slate-200",
    violet: "bg-violet-50 text-violet-700 ring-violet-200",
  };
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${tones[tone]}`}>{children}</span>;
}

export function Button({ children, variant = "primary", className = "", disabled = false, ...props }) {
  const variants = {
    primary: "bg-sky-600 text-white hover:bg-sky-700 shadow-sm shadow-sky-100 disabled:bg-sky-400 disabled:cursor-not-allowed",
    secondary: "bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50 disabled:bg-slate-50 disabled:cursor-not-allowed",
    danger: "bg-rose-600 text-white hover:bg-rose-700 disabled:bg-rose-400 disabled:cursor-not-allowed",
    soft: "bg-sky-50 text-sky-700 hover:bg-sky-100 disabled:bg-sky-50 disabled:cursor-not-allowed",
  };
  return (
    <button 
      className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition ${variants[variant]} ${className}`} 
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
}

export function Card({ children, className = "" }) {
  return <div className={`rounded-2xl border border-slate-200 bg-white p-5 shadow-sm ${className}`}>{children}</div>;
}

export function StatusBadge({ status }) {
  const map = {
    OCCUPIED: ["Đang ở", "green"],
    AVAILABLE: ["Đang trống", "blue"],
    PERMANENT: ["Thường trú", "green"],
    TEMPORARY: ["Tạm trú", "blue"],
    ABSENT: ["Tạm vắng", "yellow"],
    MANDATORY: ["Bắt buộc", "red"],
    DONATION: ["Tự nguyện", "violet"],
    PAID: ["Đã nộp", "green"],
    UNPAID: ["Chưa nộp", "red"],
    NEW: ["Chờ xử lý", "yellow"],
    IN_PROGRESS: ["Đang xử lý", "blue"],
    RESOLVED: ["Đã giải quyết", "green"],
    REJECTED: ["Từ chối", "red"],
    ACTIVE: ["Đang dùng", "green"],
    ENDED: ["Kết thúc", "gray"],
  };
  const [label, tone] = map[status] || [status, "gray"];
  return <Badge tone={tone}>{label}</Badge>;
}

export function DataTable({ columns, rows }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
            <tr>
              {columns.map((c) => (
                <th key={c.key} className="px-5 py-4">{c.label}</th>
              ))}
              <th className="px-5 py-4 text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((row, idx) => (
              <tr key={idx} className="hover:bg-slate-50/80">
                {columns.map((c) => (
                  <td key={c.key} className="whitespace-nowrap px-5 py-4 text-slate-700">
                    {c.render ? c.render(row) : row[c.key]}
                  </td>
                ))}
                <td className="px-5 py-4 text-right">
                  <button className="font-semibold text-sky-700 hover:text-sky-900">Chi tiết</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function Input({ label, className = "", inputClassName = "", ...props }) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1.5 block text-sm font-semibold text-slate-700">{label}</span>
      <input
        style={{ colorScheme: "light" }}
        className={`w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-sky-400 focus:ring-4 focus:ring-sky-100 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-500 ${inputClassName}`}
        {...props}
      />
    </label>
  );
}

export function Select({ label, children, value, onChange, ...props }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-semibold text-slate-700">{label}</span>
      <select
        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
        value={value}
        onChange={onChange}
        {...props}
      >
        {children}
      </select>
    </label>
  );
}

// Phân trang phía client: nhận page (1-based), tổng số dòng, kích thước trang.
// Hiển thị nút trước/sau + dải số trang (rút gọn bằng dấu "…" khi nhiều trang).
export function Pagination({ page, total, pageSize, onPageChange, className = "" }) {
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  if (pageCount <= 1) return null;

  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  // Dải số trang quanh trang hiện tại (luôn có trang đầu/cuối).
  const pages = [];
  const push = (p) => { if (!pages.includes(p) && p >= 1 && p <= pageCount) pages.push(p); };
  push(1);
  for (let p = page - 1; p <= page + 1; p++) push(p);
  push(pageCount);
  pages.sort((a, b) => a - b);
  const withGaps = [];
  pages.forEach((p, i) => {
    if (i > 0 && p - pages[i - 1] > 1) withGaps.push("…");
    withGaps.push(p);
  });

  const go = (p) => onPageChange(Math.min(pageCount, Math.max(1, p)));

  return (
    <div className={`flex flex-col items-center justify-between gap-3 px-5 py-4 sm:flex-row ${className}`}>
      <p className="text-sm text-slate-500">
        Hiển thị <strong className="text-slate-700">{from}</strong>–<strong className="text-slate-700">{to}</strong> trên <strong className="text-slate-700">{total}</strong>
      </p>
      <div className="flex items-center gap-1">
        <button
          onClick={() => go(page - 1)}
          disabled={page <= 1}
          className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-slate-600 ring-1 ring-slate-200 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        {withGaps.map((p, i) =>
          p === "…" ? (
            <span key={`gap-${i}`} className="px-2 text-sm text-slate-400">…</span>
          ) : (
            <button
              key={p}
              onClick={() => go(p)}
              className={`inline-flex h-9 min-w-9 items-center justify-center rounded-xl px-2 text-sm font-semibold transition ${
                p === page
                  ? "bg-sky-600 text-white"
                  : "text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"
              }`}
            >
              {p}
            </button>
          )
        )}
        <button
          onClick={() => go(page + 1)}
          disabled={page >= pageCount}
          className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-slate-600 ring-1 ring-slate-200 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
