import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { CheckCircle2, AlertCircle } from "lucide-react";
import { getPendingAccountsAPI, approveAccountAPI, rejectAccountAPI } from "../api/authApi";
import { Badge, Button, Card, DataTable } from "../components/common";
import { SectionHeader } from "../components/layout/SectionHeader";

// Map UserDTO (tài khoản chờ duyệt) -> dòng hiển thị.
const toReg = (dto) => ({
  id: dto.id,
  fullName: dto.fullName || dto.username,
  username: dto.username,
  apartment: dto.requestedApartmentCode || "__",
  email: dto.email || "__",
  phone: dto.phone || "__",
});

export function Registrations() {
  const [pendingRegs, setPendingRegs] = useState([]);
  const [history, setHistory] = useState([]); // lịch sử xử lý trong phiên làm việc
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [acting, setActing] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);
  const [rejectReason, setRejectReason] = useState("");
  const [modalError, setModalError] = useState("");
  const [toast, setToast] = useState(null);

  const selectedReg = confirmAction?.id ? pendingRegs.find((r) => r.id === confirmAction.id) : null;

  const fetchPending = async () => {
    setLoading(true);
    setLoadError("");
    const res = await getPendingAccountsAPI();
    if (res.success) {
      setPendingRegs((Array.isArray(res.data) ? res.data : []).map(toReg));
    } else {
      setLoadError(res.message || "Không tải được danh sách chờ duyệt.");
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchPending();
  }, []);

  const showToast = (message, tone = "green") => {
    setToast({ message, tone });
    setTimeout(() => setToast(null), 3000);
  };

  const openApproveConfirm = (id) => {
    setConfirmAction({ type: "approve", id });
    setRejectReason("");
    setModalError("");
  };

  const openRejectConfirm = (id) => {
    setConfirmAction({ type: "reject", id });
    setRejectReason("");
    setModalError("");
  };

  const closeConfirm = () => {
    if (acting) return;
    setConfirmAction(null);
    setRejectReason("");
    setModalError("");
  };

  const nowText = () =>
    new Date().toLocaleString("vi-VN", { dateStyle: "short", timeStyle: "short" });

  const confirmApprove = async () => {
    if (!selectedReg) return;
    setActing(true);
    setModalError("");
    try {
      // Duyệt qua backend: PUT /api/users/{id}/approve
      const res = await approveAccountAPI(selectedReg.id);
      if (!res.success) {
        setModalError(res.message || "Duyệt tài khoản thất bại.");
        return;
      }

      setHistory((prev) => [{ ...selectedReg, status: "approved", processedAt: nowText() }, ...prev]);
      setPendingRegs((prev) => prev.filter((r) => r.id !== selectedReg.id));
      closeConfirm();
      showToast("Duyệt thành công! Tài khoản đã được kích hoạt.", "green");
    } catch (err) {
      console.error("Approve error:", err);
      setModalError("Lỗi: " + err.message);
    } finally {
      setActing(false);
    }
  };

  const confirmReject = async () => {
    if (!selectedReg) return;
    if (!rejectReason.trim()) {
      setModalError("Vui lòng nhập lý do từ chối.");
      return;
    }

    setActing(true);
    setModalError("");
    try {
      // Từ chối qua backend: DELETE /api/users/{id}/reject
      const res = await rejectAccountAPI(selectedReg.id);
      if (!res.success) {
        setModalError(res.message || "Từ chối tài khoản thất bại.");
        return;
      }

      setHistory((prev) => [
        { ...selectedReg, status: "rejected", rejectReason: rejectReason.trim(), processedAt: nowText() },
        ...prev,
      ]);
      setPendingRegs((prev) => prev.filter((r) => r.id !== selectedReg.id));
      closeConfirm();
      showToast("Đã từ chối yêu cầu đăng ký.", "red");
    } catch (err) {
      console.error("Reject error:", err);
      setModalError("Lỗi: " + err.message);
    } finally {
      setActing(false);
    }
  };

  return (
    <>
      <SectionHeader title="Duyệt Đăng Ký Cư Dân" desc={`Có ${pendingRegs.length} yêu cầu chờ duyệt`} />

      {toast && (
        <div
          className={`mb-5 rounded-2xl px-4 py-3 text-sm font-semibold ring-1 ${
            toast.tone === "red"
              ? "bg-rose-50 text-rose-700 ring-rose-200"
              : "bg-emerald-50 text-emerald-700 ring-emerald-200"
          }`}
        >
          {toast.tone === "red" ? "✕ " : "✓ "}
          {toast.message}
        </div>
      )}

      {loadError && (
        <div className="mb-5 rounded-2xl bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 ring-1 ring-rose-200">
          {loadError}
        </div>
      )}

      {loading ? (
        <Card className="py-12 text-center">
          <div className="text-lg font-semibold text-slate-500">Đang tải danh sách...</div>
        </Card>
      ) : pendingRegs.length === 0 ? (
        <Card className="py-12 text-center">
          <div className="text-lg font-semibold text-slate-500">Không có yêu cầu đăng ký nào chờ duyệt</div>
        </Card>
      ) : (
        <div className="space-y-4">
          {pendingRegs.map((reg) => (
            <Card key={reg.id} className="border-l-4 border-l-amber-400">
              <div className="grid gap-4 md:grid-cols-[1fr_auto]">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-bold text-slate-900">{reg.fullName}</h3>
                    <Badge tone="yellow">Chờ duyệt</Badge>
                  </div>
                  <div className="grid gap-2 text-sm text-slate-600 md:grid-cols-2">
                    <div><span className="font-semibold">Username:</span> {reg.username}</div>
                    <div><span className="font-semibold">Căn hộ:</span> {reg.apartment}</div>
                    <div><span className="font-semibold">Email:</span> {reg.email}</div>
                    <div><span className="font-semibold">SĐT:</span> {reg.phone}</div>
                  </div>
                </div>
                <div className="flex flex-col gap-2 md:items-end">
                  <Button variant="primary" onClick={() => openApproveConfirm(reg.id)} disabled={acting}>
                    <CheckCircle2 className="h-4 w-4" /> Duyệt
                  </Button>
                  <Button variant="danger" onClick={() => openRejectConfirm(reg.id)} disabled={acting}>
                    <AlertCircle className="h-4 w-4" /> Từ chối
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {history.length > 0 && (
        <>
          <SectionHeader title="Lịch Sử Duyệt" className="mt-8" />
          <DataTable columns={[
            { key: "fullName", label: "Họ tên" },
            { key: "username", label: "Username" },
            { key: "apartment", label: "Căn hộ" },
            { key: "email", label: "Email" },
            { key: "status", label: "Trạng thái", render: (r) => <Badge tone={r.status === "approved" ? "green" : "red"}>{r.status === "approved" ? "Đã duyệt" : "Từ chối"}</Badge> },
            { key: "processedAt", label: "Ngày xử lý" },
          ]} rows={history} />
        </>
      )}

      {confirmAction && selectedReg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 12 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl"
          >
            <div className="mb-5 flex items-start gap-4">
              <div
                className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${
                  confirmAction.type === "approve"
                    ? "bg-emerald-50 text-emerald-600"
                    : "bg-rose-50 text-rose-600"
                }`}
              >
                {confirmAction.type === "approve" ? (
                  <CheckCircle2 className="h-6 w-6" />
                ) : (
                  <AlertCircle className="h-6 w-6" />
                )}
              </div>
              <div>
                <h3 className="text-xl font-black text-slate-900">
                  {confirmAction.type === "approve" ? "Xác nhận duyệt đăng ký" : "Xác nhận từ chối đăng ký"}
                </h3>
                <p className="mt-1 text-sm leading-6 text-slate-500">
                  {confirmAction.type === "approve"
                    ? "Bạn có chắc chắn muốn duyệt yêu cầu này không?"
                    : "Bạn có chắc chắn muốn từ chối yêu cầu này không? Tài khoản sẽ bị xóa khỏi hệ thống."}
                </p>
              </div>
            </div>

            <div className="mb-5 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
              <div className="grid gap-2 md:grid-cols-2">
                <p><span className="font-semibold">Họ tên:</span> {selectedReg.fullName}</p>
                <p><span className="font-semibold">Username:</span> {selectedReg.username}</p>
                <p><span className="font-semibold">Căn hộ:</span> {selectedReg.apartment}</p>
                <p><span className="font-semibold">SĐT:</span> {selectedReg.phone}</p>
                <p className="md:col-span-2"><span className="font-semibold">Email:</span> {selectedReg.email}</p>
              </div>
            </div>

            {confirmAction.type === "reject" && (
              <label className="mb-4 block">
                <span className="mb-1.5 block text-sm font-semibold text-slate-700">Lý do từ chối</span>
                <textarea
                  rows={4}
                  value={rejectReason}
                  onChange={(e) => {
                    setRejectReason(e.target.value);
                    setModalError("");
                  }}
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
                  placeholder="Nhập lý do từ chối để lưu vào lịch sử..."
                />
              </label>
            )}

            {modalError && (
              <div className="mb-4 rounded-xl bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 ring-1 ring-rose-200">
                {modalError}
              </div>
            )}

            <div className="flex justify-end gap-3">
              <Button variant="secondary" onClick={closeConfirm} disabled={acting}>
                Hủy
              </Button>
              {confirmAction.type === "approve" ? (
                <Button onClick={confirmApprove} disabled={acting}>
                  {acting ? "Đang duyệt..." : "Xác nhận duyệt"}
                </Button>
              ) : (
                <Button variant="danger" onClick={confirmReject} disabled={acting}>
                  {acting ? "Đang xử lý..." : "Xác nhận từ chối"}
                </Button>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </>
  );
}
