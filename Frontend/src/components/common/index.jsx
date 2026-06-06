import { motion } from "framer-motion";
import { Search, Plus } from "lucide-react";
import { money, getPeriodSummaryText, adminBankInfo } from "../../utils/helpers";

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

export function Input({ label, className = "", ...props }) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1.5 block text-sm font-semibold text-slate-700">{label}</span>
      <input style={{ colorScheme: "light" }} className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-sky-400 focus:ring-4 focus:ring-sky-100" {...props} />
    </label>
  );
}

export function Select({ label, children, value, onChange }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-semibold text-slate-700">{label}</span>
      <select
        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
        value={value}
        onChange={onChange}
      >
        {children}
      </select>
    </label>
  );
}

export function FakeQRCode({ room, amount }) {
  const seed = `${room}-${amount}-${adminBankInfo.accountNumber}`;
  return (
    <div className="grid h-44 w-44 grid-cols-9 gap-1 rounded-2xl bg-white p-3 ring-1 ring-slate-200">
      {Array.from({ length: 81 }).map((_, index) => {
        const active = index < 10 || (index % 9 < 2 && index < 27) || (((index + seed.length) * 7 + seed.charCodeAt(index % seed.length)) % 5 < 2);
        return <span key={index} className={`rounded-sm ${active ? "bg-slate-950" : "bg-slate-100"}`} />;
      })}
    </div>
  );
}

export function NotificationDetailModal({ notification, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} onClick={(e) => e.stopPropagation()} className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-3xl bg-white p-6 shadow-xl">
        <div className="mb-4">
          <h3 className="text-xl font-black text-slate-900">{notification.title}</h3>
          <p className="mt-1 text-sm text-slate-500">{notification.scope} • {notification.date}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-700">{notification.content}</div>
        <div className="mt-5 flex justify-end"><Button variant="secondary" onClick={onClose}>Đóng</Button></div>
      </motion.div>
    </div>
  );
}

export function ComplaintReadOnlyModal({ complaint, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} onClick={(e) => e.stopPropagation()} className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-3xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h3 className="text-xl font-black text-slate-900">{complaint.title}</h3>
            <p className="mt-1 text-sm text-slate-500">{complaint.id} • {complaint.sender}</p>
          </div>
          <StatusBadge status={complaint.status} />
        </div>
        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Nội dung khiếu nại</p>
            <p className="mt-2 text-sm leading-6 text-slate-700">{complaint.content}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Nội dung xử lý</p>
            <p className="mt-2 text-sm leading-6 text-slate-700">{complaint.response || "Ban quản trị chưa cập nhật nội dung xử lý."}</p>
          </div>
        </div>
        <div className="mt-5 flex justify-end"><Button variant="secondary" onClick={onClose}>Đóng</Button></div>
      </motion.div>
    </div>
  );
}

export function PaymentQRModal({ bill, onClose }) {
  const remaining = Math.max(0, Number(bill.amountDue || 0) - Number(bill.amountPaid || 0));
  const transferContent = `BLUEMOON ${bill.room} ${getPeriodSummaryText(bill)}`.replace(/\s+/g, " ");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <motion.div initial={{ scale: 0.95, opacity: 0, y: 12 }} animate={{ scale: 1, opacity: 1, y: 0 }} onClick={(e) => e.stopPropagation()} className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h3 className="text-xl font-black text-slate-900">Thanh toán phí căn hộ {bill.room}</h3>
            <p className="mt-1 text-sm text-slate-500">{getPeriodSummaryText(bill)}</p>
          </div>
          <Badge tone={bill.status === "PAID" ? "green" : "red"}>{bill.status === "PAID" ? "Đã nộp" : "Chưa nộp"}</Badge>
        </div>

        <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
          <div className="flex flex-col items-center justify-center rounded-3xl bg-slate-50 p-5 ring-1 ring-slate-200">
            <FakeQRCode room={bill.room} amount={remaining} />
            <p className="mt-3 text-center text-xs font-semibold text-slate-500">Quét mã QR để thanh toán</p>
          </div>
          <div className="space-y-4">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm text-slate-500">Số tiền cần chuyển</p>
              <p className="mt-1 text-3xl font-black text-rose-700">{money(remaining)}</p>
            </div>
            <div className="grid gap-3 text-sm md:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 p-4"><p className="text-xs font-bold uppercase tracking-wide text-slate-500">Ngân hàng</p><p className="mt-1 font-black text-slate-900">{adminBankInfo.bankName}</p></div>
              <div className="rounded-2xl border border-slate-200 p-4"><p className="text-xs font-bold uppercase tracking-wide text-slate-500">Số tài khoản</p><p className="mt-1 font-black text-slate-900">{adminBankInfo.accountNumber}</p></div>
              <div className="rounded-2xl border border-slate-200 p-4 md:col-span-2"><p className="text-xs font-bold uppercase tracking-wide text-slate-500">Chủ tài khoản</p><p className="mt-1 font-black text-slate-900">{adminBankInfo.accountHolder}</p></div>
              <div className="rounded-2xl border border-slate-200 p-4 md:col-span-2"><p className="text-xs font-bold uppercase tracking-wide text-slate-500">Nội dung chuyển khoản</p><p className="mt-1 font-black text-slate-900">{transferContent}</p></div>
            </div>
          </div>
        </div>

        <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
              <tr><th className="px-4 py-3">Kỳ</th><th className="px-4 py-3">Nhóm</th><th className="px-4 py-3">Khoản</th><th className="px-4 py-3">Cách tính</th><th className="px-4 py-3 text-right">Số tiền</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {bill.items.map((item) => (
                <tr key={item.id}>
                  <td className="px-4 py-3 text-slate-700">{item.period}</td>
                  <td className="px-4 py-3 text-slate-700">{item.group}</td>
                  <td className="px-4 py-3 font-semibold text-slate-800">{item.name}</td>
                  <td className="px-4 py-3 text-slate-600">{item.formula}</td>
                  <td className="px-4 py-3 text-right font-bold text-slate-900">{money(item.amountDue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-5 flex justify-end"><Button variant="secondary" onClick={onClose}>Đóng</Button></div>
      </motion.div>
    </div>
  );
}

export function Toolbar({ placeholder = "Tìm kiếm...", button = "Thêm mới" }) {
  return (
    <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
      <div className="relative max-w-md flex-1">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input placeholder={placeholder} className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm outline-none focus:border-sky-400 focus:ring-4 focus:ring-sky-100" />
      </div>
      <Button><Plus className="h-4 w-4" /> {button}</Button>
    </div>
  );
}
