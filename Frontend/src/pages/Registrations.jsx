import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { CheckCircle2, AlertCircle } from "lucide-react";
import { getPendingAccountsAPI, approveAccountAPI, rejectAccountAPI } from "../api/authApi";
import { searchApartmentsAPI } from "../api/apartmentApi";
import { getActiveHouseholdAPI } from "../api/householdApi";
import { Badge, Button, Card, DataTable, Input, Select } from "../components/common";
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

const today = () => new Date().toISOString().slice(0, 10);

const emptyApproveForm = () => ({
  linkMode: "link", // "link" = gắn nhân khẩu có sẵn | "new" = tạo nhân khẩu mới
  linkResidentId: "",
  idCard: "",
  dateOfBirth: "",
  gender: "MALE",
  relationToHead: "",
  residencyStatus: "PERMANENT",
  newHouseholdCode: "",
  moveInDate: today(),
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

  // Bối cảnh căn hộ mà tài khoản yêu cầu (để quyết định cách gắn nhân khẩu khi duyệt).
  const [aptCtx, setAptCtx] = useState({ loading: false, error: "", apartment: null, household: null });
  const [approveForm, setApproveForm] = useState(emptyApproveForm);

  const selectedReg = confirmAction?.id ? pendingRegs.find((r) => r.id === confirmAction.id) : null;
  const isOccupied = !!aptCtx.household;
  const activeResidents = (aptCtx.household?.residents || []).filter((r) => r.status === "ACTIVE");

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

  // Tra cứu căn hộ + hộ dân ACTIVE theo mã căn hộ đã yêu cầu khi đăng ký.
  const loadApartmentContext = async (code) => {
    setAptCtx({ loading: true, error: "", apartment: null, household: null });
    if (!code || code === "__") {
      setAptCtx({ loading: false, error: "Tài khoản chưa khai báo mã căn hộ.", apartment: null, household: null });
      return;
    }
    const res = await searchApartmentsAPI({ code, size: 50 });
    if (!res.success) {
      setAptCtx({ loading: false, error: res.message || "Không tra cứu được căn hộ.", apartment: null, household: null });
      return;
    }
    const items = res.data?.items || [];
    const found = items.find((a) => String(a.code || "").toLowerCase() === String(code).toLowerCase());
    if (!found) {
      setAptCtx({ loading: false, error: `Không tìm thấy căn hộ với mã '${code}'.`, apartment: null, household: null });
      return;
    }
    // Căn hộ trống -> lập hộ mới (A1). Căn hộ đang ở -> nạp danh sách nhân khẩu để gắn.
    if (found.status === "OCCUPIED") {
      const hhRes = await getActiveHouseholdAPI(found.id);
      const household = hhRes.success ? hhRes.data : null;
      const residents = (household?.residents || []).filter((r) => r.status === "ACTIVE");
      setAptCtx({ loading: false, error: "", apartment: found, household });
      setApproveForm({ ...emptyApproveForm(), linkMode: residents.length > 0 ? "link" : "new" });
    } else {
      setAptCtx({ loading: false, error: "", apartment: found, household: null });
      setApproveForm({ ...emptyApproveForm(), newHouseholdCode: "", moveInDate: today() });
    }
  };

  const openApproveConfirm = (id) => {
    setConfirmAction({ type: "approve", id });
    setRejectReason("");
    setModalError("");
    setApproveForm(emptyApproveForm());
    const reg = pendingRegs.find((r) => r.id === id);
    loadApartmentContext(reg?.apartment);
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
    setAptCtx({ loading: false, error: "", apartment: null, household: null });
    setApproveForm(emptyApproveForm());
  };

  const nowText = () =>
    new Date().toLocaleString("vi-VN", { dateStyle: "short", timeStyle: "short" });

  const setF = (patch) => setApproveForm((prev) => ({ ...prev, ...patch }));

  // Dựng payload gắn/tạo nhân khẩu gửi kèm khi duyệt; trả null nếu dữ liệu chưa hợp lệ (kèm setModalError).
  const buildApprovePayload = () => {
    if (!aptCtx.apartment) {
      setModalError(aptCtx.error || "Chưa xác định được căn hộ của tài khoản.");
      return null;
    }

    const f = approveForm;
    const needResidentInfo = () => {
      if (!/^(\d{9}|\d{12})$/.test(String(f.idCard).trim())) {
        setModalError("CCCD/CMND phải là 9 hoặc 12 chữ số.");
        return false;
      }
      if (!f.dateOfBirth) {
        setModalError("Vui lòng nhập ngày sinh của cư dân.");
        return false;
      }
      return true;
    };

    if (isOccupied) {
      if (f.linkMode === "link") {
        if (!f.linkResidentId) {
          setModalError("Vui lòng chọn nhân khẩu để gắn tài khoản.");
          return null;
        }
        return { linkResidentId: Number(f.linkResidentId) };
      }
      // Tạo nhân khẩu mới trong hộ hiện có (thành viên).
      if (!needResidentInfo()) return null;
      return {
        idCard: f.idCard.trim(),
        dateOfBirth: f.dateOfBirth,
        gender: f.gender,
        relationToHead: f.relationToHead.trim() || "Thành viên",
        residencyStatus: f.residencyStatus,
      };
    }

    // Căn hộ trống -> lập hộ mới, cư dân làm chủ hộ (A1).
    if (!f.newHouseholdCode.trim()) {
      setModalError("Vui lòng nhập mã hộ khẩu mới cho căn hộ trống.");
      return null;
    }
    if (!needResidentInfo()) return null;
    return {
      newHouseholdCode: f.newHouseholdCode.trim(),
      moveInDate: f.moveInDate || today(),
      idCard: f.idCard.trim(),
      dateOfBirth: f.dateOfBirth,
      gender: f.gender,
      residencyStatus: f.residencyStatus,
    };
  };

  const confirmApprove = async () => {
    if (!selectedReg) return;
    setModalError("");
    const payload = buildApprovePayload();
    if (!payload) return;

    setActing(true);
    try {
      // Duyệt qua backend: PUT /api/users/{id}/approve
      const res = await approveAccountAPI(selectedReg.id, payload);
      if (!res.success) {
        setModalError(res.message || "Duyệt tài khoản thất bại.");
        return;
      }

      setHistory((prev) => [{ ...selectedReg, status: "approved", processedAt: nowText() }, ...prev]);
      setPendingRegs((prev) => prev.filter((r) => r.id !== selectedReg.id));
      closeConfirm();
      showToast("Duyệt thành công! Tài khoản đã được kích hoạt và gắn vào hộ.", "green");
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
      // Từ chối qua backend: DELETE /api/users/{id}/reject?reason=... (gửi kèm lý do để lưu audit & email)
      const res = await rejectAccountAPI(selectedReg.id, rejectReason.trim());
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
            className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl"
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
                    ? "Tài khoản sẽ được gắn vào một nhân khẩu trong hộ trước khi kích hoạt."
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

            {/* ----- Khu vực gắn/tạo nhân khẩu (chỉ hiện khi DUYỆT) ----- */}
            {confirmAction.type === "approve" && (
              <div className="mb-5 space-y-4">
                {aptCtx.loading ? (
                  <div className="rounded-xl bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-500">
                    Đang kiểm tra căn hộ...
                  </div>
                ) : aptCtx.error ? (
                  <div className="rounded-xl bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 ring-1 ring-rose-200">
                    {aptCtx.error}
                  </div>
                ) : isOccupied ? (
                  <>
                    <div className="rounded-xl bg-sky-50 px-4 py-3 text-sm text-sky-800 ring-1 ring-sky-200">
                      Căn hộ <b>{aptCtx.apartment.code}</b> đã có hộ <b>{aptCtx.household.code}</b>.
                      Chọn cách gắn tài khoản vào nhân khẩu.
                    </div>

                    <Select
                      label="Cách gắn cư dân"
                      value={approveForm.linkMode}
                      onChange={(e) => setF({ linkMode: e.target.value })}
                    >
                      <option value="link" disabled={activeResidents.length === 0}>
                        Gắn vào nhân khẩu có sẵn{activeResidents.length === 0 ? " (hộ chưa có nhân khẩu)" : ""}
                      </option>
                      <option value="new">Tạo nhân khẩu mới (thành viên hộ)</option>
                    </Select>

                    {approveForm.linkMode === "link" ? (
                      <Select
                        label="Nhân khẩu trong hộ"
                        value={approveForm.linkResidentId}
                        onChange={(e) => setF({ linkResidentId: e.target.value })}
                      >
                        <option value="">-- Chọn nhân khẩu --</option>
                        {activeResidents.map((r) => (
                          <option key={r.id} value={r.id}>
                            {r.fullName}{r.relationToHead ? ` (${r.relationToHead})` : ""}
                          </option>
                        ))}
                      </Select>
                    ) : (
                      <div className="grid gap-4 md:grid-cols-2">
                        <Input
                          label="CCCD/CMND"
                          placeholder="9 hoặc 12 chữ số"
                          value={approveForm.idCard}
                          onChange={(e) => setF({ idCard: e.target.value })}
                        />
                        <Input
                          label="Ngày sinh"
                          type="date"
                          value={approveForm.dateOfBirth}
                          onChange={(e) => setF({ dateOfBirth: e.target.value })}
                        />
                        <Select label="Giới tính" value={approveForm.gender} onChange={(e) => setF({ gender: e.target.value })}>
                          <option value="MALE">Nam</option>
                          <option value="FEMALE">Nữ</option>
                          <option value="OTHER">Khác</option>
                        </Select>
                        <Input
                          label="Quan hệ với chủ hộ"
                          placeholder="VD: Con, Vợ, Chồng..."
                          value={approveForm.relationToHead}
                          onChange={(e) => setF({ relationToHead: e.target.value })}
                        />
                        <Select label="Diện cư trú" value={approveForm.residencyStatus} onChange={(e) => setF({ residencyStatus: e.target.value })}>
                          <option value="PERMANENT">Thường trú</option>
                          <option value="TEMPORARY">Tạm trú</option>
                        </Select>
                      </div>
                    )}
                  </>
                ) : aptCtx.apartment ? (
                  <>
                    <div className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800 ring-1 ring-amber-200">
                      Căn hộ <b>{aptCtx.apartment.code}</b> đang trống → sẽ lập <b>hộ mới</b> và đặt cư dân này làm <b>chủ hộ</b>.
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                      <Input
                        label="Mã hộ khẩu mới"
                        placeholder="VD: HK001"
                        value={approveForm.newHouseholdCode}
                        onChange={(e) => setF({ newHouseholdCode: e.target.value })}
                      />
                      <Input
                        label="Ngày chuyển đến"
                        type="date"
                        value={approveForm.moveInDate}
                        onChange={(e) => setF({ moveInDate: e.target.value })}
                      />
                      <Input
                        label="CCCD/CMND chủ hộ"
                        placeholder="9 hoặc 12 chữ số"
                        value={approveForm.idCard}
                        onChange={(e) => setF({ idCard: e.target.value })}
                      />
                      <Input
                        label="Ngày sinh"
                        type="date"
                        value={approveForm.dateOfBirth}
                        onChange={(e) => setF({ dateOfBirth: e.target.value })}
                      />
                      <Select label="Giới tính" value={approveForm.gender} onChange={(e) => setF({ gender: e.target.value })}>
                        <option value="MALE">Nam</option>
                        <option value="FEMALE">Nữ</option>
                        <option value="OTHER">Khác</option>
                      </Select>
                      <Select label="Diện cư trú" value={approveForm.residencyStatus} onChange={(e) => setF({ residencyStatus: e.target.value })}>
                        <option value="PERMANENT">Thường trú</option>
                        <option value="TEMPORARY">Tạm trú</option>
                      </Select>
                    </div>
                  </>
                ) : null}
              </div>
            )}

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
                  placeholder="Nhập lý do từ chối (sẽ gửi kèm email báo cho cư dân)..."
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
                <Button onClick={confirmApprove} disabled={acting || aptCtx.loading || !aptCtx.apartment}>
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
