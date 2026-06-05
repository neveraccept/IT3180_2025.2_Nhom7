import { useMemo } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { CheckCircle2, XCircle, Clock, AlertTriangle } from "lucide-react";

// ============================================================
//  VnpayReturnPage — trang kết quả thanh toán VNPay.
//  Backend (GET /api/payments/vnpay/return) verify chữ ký rồi 302 redirect về:
//    /payment-result?transactionCode=...&status=...
//  status ∈ SUCCESS | FAILED | CANCELLED | PENDING | INVALID | NOT_FOUND
//  Trang chỉ hiển thị kết quả dựa trên status (nguồn cập nhật chính là IPN ở backend).
// ============================================================
const VIEW = {
  SUCCESS: { icon: CheckCircle2, color: "text-emerald-600", ring: "ring-emerald-200", bg: "bg-emerald-50", title: "Thanh toán thành công", desc: "Giao dịch của bạn đã được ghi nhận. Khoản phí sẽ được cập nhật trạng thái đã nộp." },
  PENDING: { icon: Clock, color: "text-amber-600", ring: "ring-amber-200", bg: "bg-amber-50", title: "Đang chờ xác nhận", desc: "Giao dịch đang được xử lý. Trạng thái sẽ được cập nhật sau ít phút, vui lòng kiểm tra lại lịch sử thanh toán." },
  CANCELLED: { icon: XCircle, color: "text-slate-500", ring: "ring-slate-200", bg: "bg-slate-50", title: "Đã huỷ giao dịch", desc: "Bạn đã huỷ giao dịch trên cổng VNPay. Khoản phí chưa được thanh toán." },
  FAILED: { icon: XCircle, color: "text-rose-600", ring: "ring-rose-200", bg: "bg-rose-50", title: "Thanh toán thất bại", desc: "Giao dịch không thành công. Vui lòng thử lại hoặc chọn phương thức khác." },
  INVALID: { icon: AlertTriangle, color: "text-rose-600", ring: "ring-rose-200", bg: "bg-rose-50", title: "Giao dịch không hợp lệ", desc: "Chữ ký giao dịch không hợp lệ. Vui lòng liên hệ Ban quản lý nếu bạn đã bị trừ tiền." },
  NOT_FOUND: { icon: AlertTriangle, color: "text-rose-600", ring: "ring-rose-200", bg: "bg-rose-50", title: "Không tìm thấy giao dịch", desc: "Không tìm thấy thông tin giao dịch tương ứng." },
};

export function VnpayReturnPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const transactionCode = params.get("transactionCode") || "";
  const status = (params.get("status") || "").toUpperCase();

  const view = useMemo(() => VIEW[status] || VIEW.FAILED, [status]);
  const Icon = view.icon;

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-md rounded-3xl bg-white p-8 text-center shadow-xl">
        <div className={`mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full ${view.bg} ring-4 ${view.ring}`}>
          <Icon className={`h-10 w-10 ${view.color}`} strokeWidth={2.2} />
        </div>
        <h1 className="text-2xl font-black text-slate-900">{view.title}</h1>
        <p className="mt-3 text-sm text-slate-600">{view.desc}</p>

        {transactionCode && (
          <div className="mt-5 rounded-2xl bg-slate-50 px-4 py-3 text-sm">
            <span className="font-semibold text-slate-500">Mã giao dịch:</span>{" "}
            <span className="font-mono font-bold text-slate-800">{transactionCode}</span>
          </div>
        )}

        <div className="mt-7 flex flex-col gap-3">
          <button
            onClick={() => navigate("/app")}
            className="w-full rounded-xl bg-sky-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-sky-700"
          >
            Về trang khoản phí của tôi
          </button>
          <button
            onClick={() => navigate("/app")}
            className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
          >
            Quay lại trang chủ
          </button>
        </div>
      </div>
    </div>
  );
}
