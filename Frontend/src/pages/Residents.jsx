import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Search, Plus, AlertCircle } from "lucide-react";
import { Button, Input, Select, StatusBadge, Badge } from "../components/common";
import { SectionHeader } from "../components/layout/SectionHeader";
import {
  searchResidentsAPI,
  getResidentByIdAPI,
  createResidentAPI,
  updateResidentAPI,
  moveOutResidentAPI,
  registerTemporaryResidenceAPI,
} from "../api/residentApi";

const PAGE_SIZE = 20;

const GENDER_LABEL = { MALE: "Nam", FEMALE: "Nữ", OTHER: "Khác" };
const yearOf = (dateStr) => (dateStr ? String(dateStr).slice(0, 4) : "—");

// Trạng thái nhân khẩu (ACTIVE/MOVED_OUT) — hiển thị riêng để không trùng nhãn với StatusBadge "ACTIVE"
function ResidentStateBadge({ status }) {
  if (status === "MOVED_OUT") return <Badge tone="gray">Đã chuyển đi</Badge>;
  return <Badge tone="green">Đang ở</Badge>;
}

const emptyForm = {
  householdId: "",
  fullName: "",
  idCard: "",
  dateOfBirth: "",
  gender: "MALE",
  relationToHead: "",
  residencyStatus: "PERMANENT",
};

export function Residents() {
  const [residents, setResidents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);

  const [searchFilters, setSearchFilters] = useState({ name: "", idCard: "", residencyStatus: "" });
  const [appliedFilters, setAppliedFilters] = useState({});

  // Form thêm/sửa
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState(emptyForm);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  // Modal chi tiết
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState("");
  const [actionMsg, setActionMsg] = useState("");

  // Xác nhận chuyển khỏi hộ
  const [moveOutConfirm, setMoveOutConfirm] = useState(null);

  const loadPage = async (targetPage = 0, applied = appliedFilters) => {
    setLoading(true);
    setError("");
    const res = await searchResidentsAPI({ ...applied, page: targetPage, size: PAGE_SIZE });
    if (res.success && res.data) {
      setResidents(res.data.items || []);
      setTotalPages(res.data.totalPages || 0);
      setTotalElements(res.data.totalElements || 0);
      setPage(res.data.page ?? targetPage);
    } else {
      setResidents([]);
      setTotalPages(0);
      setTotalElements(0);
      setError(res.message || "Không tải được danh sách nhân khẩu.");
    }
    setLoading(false);
  };

  useEffect(() => {
    loadPage(0, {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSearch = () => {
    const applied = {};
    if (searchFilters.name.trim()) applied.name = searchFilters.name.trim();
    if (searchFilters.idCard.trim()) applied.idCard = searchFilters.idCard.trim();
    if (searchFilters.residencyStatus) applied.residencyStatus = searchFilters.residencyStatus;
    setAppliedFilters(applied);
    loadPage(0, applied);
  };

  const handleResetSearch = () => {
    setSearchFilters({ name: "", idCard: "", residencyStatus: "" });
    setAppliedFilters({});
    loadPage(0, {});
  };

  const openCreateForm = () => {
    setFormData(emptyForm);
    setEditingId(null);
    setFormError("");
    setShowForm(true);
  };

  const openEditForm = (resident) => {
    setFormData({
      householdId: resident.householdId ?? "",
      fullName: resident.fullName || "",
      idCard: resident.idCard || "",
      dateOfBirth: resident.dateOfBirth || "",
      gender: resident.gender || "MALE",
      relationToHead: resident.relationToHead || "",
      residencyStatus: resident.residencyStatus || "PERMANENT",
    });
    setEditingId(resident.id);
    setFormError("");
    setShowForm(true);
  };

  const handleSave = async () => {
    setFormError("");
    if (!formData.fullName.trim() || !formData.idCard.trim() || !formData.dateOfBirth || !formData.relationToHead.trim()) {
      setFormError("Vui lòng nhập đầy đủ: họ tên, CCCD/CMND, ngày sinh, quan hệ với chủ hộ.");
      return;
    }

    setSaving(true);
    let res;
    if (editingId !== null) {
      // F3.2 - UpdateResidentRequest: fullName, idCard, dateOfBirth, gender, relationToHead
      res = await updateResidentAPI(editingId, {
        fullName: formData.fullName.trim(),
        idCard: formData.idCard.trim(),
        dateOfBirth: formData.dateOfBirth,
        gender: formData.gender,
        relationToHead: formData.relationToHead.trim(),
      });
    } else {
      // F3.1 - CreateResidentRequest: householdId (bắt buộc), ...
      if (!formData.householdId) {
        setFormError("Vui lòng nhập mã hộ khẩu (householdId) để thêm nhân khẩu vào hộ.");
        setSaving(false);
        return;
      }
      res = await createResidentAPI({
        householdId: Number(formData.householdId),
        fullName: formData.fullName.trim(),
        idCard: formData.idCard.trim(),
        dateOfBirth: formData.dateOfBirth,
        gender: formData.gender,
        relationToHead: formData.relationToHead.trim(),
        residencyStatus: formData.residencyStatus || undefined,
      });
    }
    setSaving(false);

    if (res.success) {
      setShowForm(false);
      setEditingId(null);
      setFormData(emptyForm);
      setActionMsg(res.message || "Lưu nhân khẩu thành công.");
      loadPage(page);
    } else {
      setFormError(res.message || "Lưu nhân khẩu thất bại.");
    }
  };

  const handleCancelForm = () => {
    setShowForm(false);
    setEditingId(null);
    setFormData(emptyForm);
    setFormError("");
  };

  const openDetail = async (id) => {
    setDetail({ id });
    setDetailError("");
    setActionMsg("");
    setDetailLoading(true);
    const res = await getResidentByIdAPI(id);
    if (res.success && res.data) {
      setDetail(res.data);
    } else {
      setDetailError(res.message || "Không tải được chi tiết nhân khẩu.");
    }
    setDetailLoading(false);
  };

  const closeDetail = () => {
    setDetail(null);
    setDetailError("");
  };

  const handleRegisterTemporary = async (id) => {
    setActionMsg("");
    const res = await registerTemporaryResidenceAPI(id);
    if (res.success) {
      setActionMsg(res.message || "Đăng ký tạm trú thành công.");
      if (res.data) setDetail(res.data);
      loadPage(page);
    } else {
      setDetailError(res.message || "Đăng ký tạm trú thất bại.");
    }
  };

  const handleConfirmMoveOut = async () => {
    if (!moveOutConfirm) return;
    const res = await moveOutResidentAPI(moveOutConfirm.id);
    setMoveOutConfirm(null);
    if (res.success) {
      setActionMsg(res.message || "Đã chuyển nhân khẩu khỏi hộ.");
      if (detail?.id === moveOutConfirm.id) closeDetail();
      loadPage(page);
    } else {
      setError(res.message || "Chuyển nhân khẩu khỏi hộ thất bại.");
    }
  };

  return (
    <>
      <SectionHeader
        title="Quản lý nhân khẩu"
        desc="Thêm/sửa nhân khẩu, đăng ký thường trú hoặc tạm trú."
        action={<Button onClick={openCreateForm}><Plus className="h-4 w-4" /> Thêm nhân khẩu</Button>}
      />

      {actionMsg && (
        <div className="mb-5 rounded-xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700 ring-1 ring-emerald-200">{actionMsg}</div>
      )}

      {/* Form thêm/sửa */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="rounded-3xl bg-white p-6 shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <h3 className="mb-4 text-lg font-bold">{editingId !== null ? "Chỉnh sửa nhân khẩu" : "Thêm nhân khẩu mới"}</h3>
            <div className="space-y-4">
              {editingId === null && (
                <Input
                  label="Mã hộ khẩu (householdId)"
                  placeholder="VD: 1"
                  value={formData.householdId}
                  onChange={(e) => setFormData({ ...formData, householdId: e.target.value })}
                />
              )}
              <Input
                label="Họ tên"
                placeholder="Nguyễn Văn A"
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
              />
              <Input
                label="CCCD/CMND"
                placeholder="9 hoặc 12 chữ số"
                value={formData.idCard}
                onChange={(e) => setFormData({ ...formData, idCard: e.target.value })}
              />
              <Input
                label="Ngày sinh"
                type="date"
                value={formData.dateOfBirth}
                onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
              />
              <Select
                label="Giới tính"
                value={formData.gender}
                onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
              >
                <option value="MALE">Nam</option>
                <option value="FEMALE">Nữ</option>
                <option value="OTHER">Khác</option>
              </Select>
              <Input
                label="Quan hệ với chủ hộ"
                placeholder="Chủ hộ, Vợ, Con, v.v."
                value={formData.relationToHead}
                onChange={(e) => setFormData({ ...formData, relationToHead: e.target.value })}
              />
              {editingId === null && (
                <Select
                  label="Cư trú"
                  value={formData.residencyStatus}
                  onChange={(e) => setFormData({ ...formData, residencyStatus: e.target.value })}
                >
                  <option value="PERMANENT">Thường trú</option>
                  <option value="TEMPORARY">Tạm trú</option>
                </Select>
              )}
              {formError && <div className="rounded-xl bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 ring-1 ring-rose-200">{formError}</div>}
              <div className="flex justify-end gap-3 pt-4">
                <Button variant="secondary" onClick={handleCancelForm} disabled={saving}>Hủy</Button>
                <Button onClick={handleSave} disabled={saving}>{saving ? "Đang lưu…" : editingId !== null ? "Lưu" : "Thêm nhân khẩu"}</Button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Xác nhận chuyển khỏi hộ */}
      {moveOutConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="rounded-3xl bg-white p-6 shadow-xl max-w-sm w-full">
            <div className="flex items-center gap-3 mb-4">
              <div className="rounded-full bg-rose-100 p-3">
                <AlertCircle className="h-6 w-6 text-rose-600" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">Chuyển khỏi hộ</h3>
            </div>
            <p className="text-slate-600 mb-6">
              Bạn có chắc muốn chuyển nhân khẩu <strong>{moveOutConfirm.name}</strong> ra khỏi hộ? Nhân khẩu sẽ chuyển sang trạng thái "Đã chuyển đi".
            </p>
            <div className="flex gap-3 justify-end">
              <Button variant="secondary" onClick={() => setMoveOutConfirm(null)}>Hủy</Button>
              <Button variant="danger" onClick={handleConfirmMoveOut}>Chuyển khỏi hộ</Button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Modal chi tiết */}
      {detail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <motion.div initial={{ scale: 0.95, opacity: 0, y: 12 }} animate={{ scale: 1, opacity: 1, y: 0 }} className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl">
            {detailLoading ? (
              <div className="px-4 py-10 text-center text-sm font-semibold text-slate-500">Đang tải chi tiết nhân khẩu…</div>
            ) : detailError ? (
              <>
                <div className="rounded-xl bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 ring-1 ring-rose-200">{detailError}</div>
                <div className="mt-5 flex justify-end"><Button variant="secondary" onClick={closeDetail}>Đóng</Button></div>
              </>
            ) : (
              <>
                <div className="mb-5 flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-xl font-black text-slate-900">{detail.fullName}</h3>
                    <p className="mt-1 text-sm text-slate-500">
                      {GENDER_LABEL[detail.gender] || detail.gender} • {detail.dateOfBirth || "—"} • {detail.relationToHead || "—"}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <StatusBadge status={detail.residencyStatus} />
                    <ResidentStateBadge status={detail.status} />
                  </div>
                </div>

                <div className="mb-5 grid gap-4 md:grid-cols-3">
                  <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
                    <p className="text-xs font-bold uppercase tracking-wide text-slate-500">CCCD/CMND</p>
                    <p className="mt-1 text-lg font-black text-slate-900">{detail.idCard || "—"}</p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
                    <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Mã hộ khẩu</p>
                    <p className="mt-1 text-lg font-black text-slate-900">{detail.householdCode || "—"}</p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
                    <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Căn hộ</p>
                    <p className="mt-1 text-lg font-black text-slate-900">{detail.apartmentCode || "—"}</p>
                  </div>
                </div>

                {actionMsg && (
                  <div className="mb-4 rounded-xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700 ring-1 ring-emerald-200">{actionMsg}</div>
                )}

                <div className="mt-5 flex flex-wrap justify-end gap-3">
                  {detail.status === "ACTIVE" && (
                    <>
                      <Button variant="secondary" onClick={() => openEditForm(detail)}>Chỉnh sửa</Button>
                      {detail.residencyStatus !== "TEMPORARY" && (
                        <Button variant="soft" onClick={() => handleRegisterTemporary(detail.id)}>Đăng ký tạm trú</Button>
                      )}
                      <Button variant="danger" onClick={() => setMoveOutConfirm({ id: detail.id, name: detail.fullName })}>Chuyển khỏi hộ</Button>
                    </>
                  )}
                  <Button variant="secondary" onClick={closeDetail}>Đóng</Button>
                </div>
              </>
            )}
          </motion.div>
        </div>
      )}

      {/* Bộ lọc */}
      <div className="mb-5 grid gap-3 md:grid-cols-3">
        <Input
          label="Tìm theo họ tên"
          placeholder="Nhập họ tên"
          value={searchFilters.name}
          onChange={(e) => setSearchFilters({ ...searchFilters, name: e.target.value })}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
        />
        <Input
          label="Tìm theo CCCD/CMND"
          placeholder="Nhập CCCD/CMND"
          value={searchFilters.idCard}
          onChange={(e) => setSearchFilters({ ...searchFilters, idCard: e.target.value })}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
        />
        <Select
          label="Tình trạng cư trú"
          value={searchFilters.residencyStatus}
          onChange={(e) => setSearchFilters({ ...searchFilters, residencyStatus: e.target.value })}
        >
          <option value="">Tất cả</option>
          <option value="PERMANENT">Thường trú</option>
          <option value="TEMPORARY">Tạm trú</option>
        </Select>
      </div>
      <div className="mb-5 flex gap-3">
        <Button onClick={handleSearch}><Search className="h-4 w-4" /> Tìm kiếm</Button>
        <Button variant="secondary" onClick={handleResetSearch}>Xoá bộ lọc</Button>
      </div>

      {error && (
        <div className="mb-5 rounded-xl bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 ring-1 ring-rose-200">{error}</div>
      )}

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-5 py-4">Họ tên</th>
                <th className="px-5 py-4">Năm sinh</th>
                <th className="px-5 py-4">Giới tính</th>
                <th className="px-5 py-4">CCCD/CMND</th>
                <th className="px-5 py-4">Quan hệ</th>
                <th className="px-5 py-4">Cư trú</th>
                <th className="px-5 py-4 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={7} className="px-5 py-10 text-center text-sm font-semibold text-slate-500">Đang tải dữ liệu…</td></tr>
              ) : residents.length === 0 ? (
                <tr><td colSpan={7} className="px-5 py-10 text-center text-sm font-semibold text-slate-500">Không có nhân khẩu phù hợp.</td></tr>
              ) : (
                residents.map((r) => (
                  <tr key={r.id} className={`hover:bg-slate-50/80 ${r.status === "MOVED_OUT" ? "opacity-60" : ""}`}>
                    <td className="whitespace-nowrap px-5 py-4 font-semibold text-slate-800">{r.fullName}</td>
                    <td className="whitespace-nowrap px-5 py-4 text-slate-700">{yearOf(r.dateOfBirth)}</td>
                    <td className="whitespace-nowrap px-5 py-4 text-slate-700">{GENDER_LABEL[r.gender] || r.gender || "—"}</td>
                    <td className="whitespace-nowrap px-5 py-4 text-slate-700">{r.idCard || "—"}</td>
                    <td className="whitespace-nowrap px-5 py-4 text-slate-700">{r.relationToHead || "—"}</td>
                    <td className="whitespace-nowrap px-5 py-4"><StatusBadge status={r.residencyStatus} /></td>
                    <td className="px-5 py-4 text-right">
                      <button onClick={() => openDetail(r.id)} className="font-semibold text-sky-700 hover:text-sky-900">Chi tiết</button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between">
          <p className="text-sm text-slate-500">Tổng {totalElements} nhân khẩu • Trang {page + 1}/{totalPages}</p>
          <div className="flex gap-2">
            <Button variant="secondary" disabled={page <= 0 || loading} onClick={() => loadPage(page - 1)}>Trước</Button>
            <Button variant="secondary" disabled={page >= totalPages - 1 || loading} onClick={() => loadPage(page + 1)}>Sau</Button>
          </div>
        </div>
      )}
    </>
  );
}
