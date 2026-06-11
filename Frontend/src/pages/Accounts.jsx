import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Search, Plus, Trash2, Lock, Unlock, Pencil, Save } from "lucide-react";
import { getAllUsersAPI, createInternalAccountAPI, updateUserAPI, deleteUserAPI, lockUserAPI, unlockUserAPI } from "../api/authApi";
import { searchApartmentsAPI } from "../api/apartmentApi";
import { getActiveHouseholdAPI } from "../api/householdApi";
import { Badge, Button, Input, Select, Pagination } from "../components/common";
import { SectionHeader } from "../components/layout/SectionHeader";

const today = () => new Date().toISOString().slice(0, 10);

// Form thông tin nhân khẩu gắn kèm khi tạo tài khoản RESIDENT có căn hộ.
const emptyResForm = () => ({
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

// Map UserDTO (backend) -> dòng hiển thị trên bảng.
const toRow = (dto) => ({
  id: dto.id,
  username: dto.username,
  fullName: dto.fullName || dto.username,
  email: dto.email || "",
  phone: dto.phone || "",
  // Ưu tiên căn hộ thực tế qua household; fallback về mã đã khai khi đăng ký.
  apartment: dto.apartmentCode || dto.requestedApartmentCode || "",
  role: dto.role || "RESIDENT",
  active: dto.active ? "Hoạt động" : "Khoá",
});

export function Accounts() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const emptyForm = {
    fullName: "",
    username: "",
    password: "",
    confirmPassword: "",
    email: "",
    phone: "",
    apartment: "",
    role: "RESIDENT",
  };

  const [showForm, setShowForm] = useState(false);
  const [mode, setMode] = useState("create"); // "create" | "view" | "edit"
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [searchKeyword, setSearchKeyword] = useState("");
  const [formData, setFormData] = useState(emptyForm);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 20;
  const isAdminRole = formData.role === "ADMIN";

  // Tài khoản đang xem chi tiết (cần id để gọi API xóa).
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [toast, setToast] = useState(null);

  // Bối cảnh căn hộ + form nhân khẩu khi tạo tài khoản RESIDENT có gắn căn hộ.
  const [aptCtx, setAptCtx] = useState({ loading: false, error: "", apartment: null, household: null });
  const [resForm, setResForm] = useState(emptyResForm);
  const isResidentRole = formData.role === "RESIDENT";
  const isOccupied = !!aptCtx.household;
  const activeResidents = (aptCtx.household?.residents || []).filter((r) => r.status === "ACTIVE");
  const setR = (patch) => setResForm((prev) => ({ ...prev, ...patch }));

  const resetAptCtx = () => {
    setAptCtx({ loading: false, error: "", apartment: null, household: null });
    setResForm(emptyResForm());
  };

  // Tra cứu căn hộ + hộ ACTIVE theo mã, để biết nên gắn nhân khẩu sẵn có / tạo mới / lập hộ mới.
  const loadApartmentContext = async (code) => {
    const trimmed = (code || "").trim();
    if (!trimmed) {
      resetAptCtx();
      return;
    }
    setAptCtx({ loading: true, error: "", apartment: null, household: null });
    const res = await searchApartmentsAPI({ code: trimmed, size: 50 });
    if (!res.success) {
      setAptCtx({ loading: false, error: res.message || "Không tra cứu được căn hộ.", apartment: null, household: null });
      return;
    }
    const items = res.data?.items || [];
    const found = items.find((a) => String(a.code || "").toLowerCase() === trimmed.toLowerCase());
    if (!found) {
      setAptCtx({ loading: false, error: `Không tìm thấy căn hộ với mã '${trimmed}'.`, apartment: null, household: null });
      return;
    }
    if (found.status === "OCCUPIED") {
      const hhRes = await getActiveHouseholdAPI(found.id);
      const household = hhRes.success ? hhRes.data : null;
      const residents = (household?.residents || []).filter((r) => r.status === "ACTIVE");
      setAptCtx({ loading: false, error: "", apartment: found, household });
      setResForm({ ...emptyResForm(), linkMode: residents.length > 0 ? "link" : "new" });
    } else {
      setAptCtx({ loading: false, error: "", apartment: found, household: null });
      setResForm({ ...emptyResForm(), newHouseholdCode: "", moveInDate: today() });
    }
  };

  const showToast = (message, tone = "green") => {
    setToast({ message, tone });
    setTimeout(() => setToast(null), 3000);
  };

  // Tải danh sách tài khoản thật từ backend (GET /api/users)
  const fetchUsers = async () => {
    setLoading(true);
    setLoadError("");
    const res = await getAllUsersAPI();
    if (res.success) {
      setRows((Array.isArray(res.data) ? res.data : []).map(toRow));
    } else {
      setLoadError(res.message || "Không tải được danh sách tài khoản.");
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const filteredRows = rows.filter((account) => {
    const keyword = searchKeyword.trim().toLowerCase();
    if (!keyword) return true;
    return (
      String(account.username || "").toLowerCase().includes(keyword) ||
      String(account.fullName || "").toLowerCase().includes(keyword) ||
      String(account.email || "").toLowerCase().includes(keyword) ||
      String(account.phone || "").toLowerCase().includes(keyword) ||
      String(account.apartment || "").toLowerCase().includes(keyword)
    );
  });

  // Phân trang phía client: 20 tài khoản/trang.
  const pagedRows = filteredRows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // Về trang 1 mỗi khi từ khoá tìm kiếm thay đổi để tránh trang rỗng.
  useEffect(() => {
    setPage(1);
  }, [searchKeyword]);

  const openCreateForm = () => {
    setFormData(emptyForm);
    setMode("create");
    setError("");
    resetAptCtx();
    setShowForm(true);
  };

  const openDetail = (account) => {
    setSelectedAccount(account);
    setFormData({
      fullName: account.fullName || "",
      username: account.username || "",
      password: "",
      confirmPassword: "",
      email: account.email || "",
      phone: account.phone || "",
      apartment: account.apartment || "",
      role: account.role || "RESIDENT",
    });
    setMode("view");
    setError("");
    setShowForm(true);
  };

  // Gọi API xóa mềm tài khoản đang xem, sau đó tải lại danh sách.
  const handleDelete = async () => {
    if (!selectedAccount?.id) return;
    setDeleting(true);
    const res = await deleteUserAPI(selectedAccount.id);
    setDeleting(false);
    if (!res.success) {
      setConfirmDelete(false);
      showToast(res.message || "Xóa tài khoản thất bại.", "red");
      return;
    }
    setConfirmDelete(false);
    handleCancel();
    showToast("Đã xóa tài khoản thành công.", "green");
    fetchUsers();
  };

  // Khóa / mở khóa tài khoản đang xem.
  const handleToggleLock = async () => {
    if (!selectedAccount?.id) return;
    const isLocked = selectedAccount.active === "Khoá";
    setToggling(true);
    const res = isLocked ? await unlockUserAPI(selectedAccount.id) : await lockUserAPI(selectedAccount.id);
    setToggling(false);
    if (!res.success) {
      showToast(res.message || "Đổi trạng thái khóa thất bại.", "red");
      return;
    }
    handleCancel();
    showToast(isLocked ? "Đã mở khóa tài khoản." : "Đã khóa tài khoản.", "green");
    fetchUsers();
  };

  const handleCancel = () => {
    setFormData(emptyForm);
    setError("");
    resetAptCtx();
    setShowForm(false);
  };

  const validateAccountInfo = () => {
    if (!formData.fullName.trim() || !formData.username.trim() || !formData.email.trim()) {
      setError("Vui lòng nhập đầy đủ họ tên, username và email");
      return false;
    }
    return true;
  };

  const validateCreateForm = () => {
    if (
      !formData.fullName.trim() ||
      !formData.username.trim() ||
      !formData.email.trim()
    ) {
      setError("Vui lòng nhập đầy đủ họ tên, username và email");
      return false;
    }
    if (!formData.password.trim() || formData.password.length < 8) {
      setError("Mật khẩu phải có tối thiểu 8 ký tự");
      return false;
    }
    if (formData.password !== formData.confirmPassword) {
      setError("Mật khẩu nhập lại không khớp");
      return false;
    }
    return true;
  };

  const handleRoleChange = (role) => {
    setFormData((prev) => ({
      ...prev,
      role,
      apartment: role === "ADMIN" ? "" : prev.apartment,
    }));
    // Tài khoản nội bộ (ADMIN) không gắn căn hộ/nhân khẩu.
    if (role === "ADMIN") resetAptCtx();
  };

  // Dựng phần thông tin nhân khẩu cho tài khoản RESIDENT có gắn căn hộ.
  // Trả về object payload (có thể rỗng) hoặc null nếu dữ liệu chưa hợp lệ (kèm setError).
  const buildResidentPart = () => {
    const apartmentCode = formData.apartment.trim();
    // Không phải cư dân, hoặc cư dân nhưng không gắn căn hộ -> tạo tài khoản trơn.
    if (isAdminRole || !apartmentCode) return {};

    if (aptCtx.loading) {
      setError("Đang kiểm tra căn hộ, vui lòng đợi giây lát.");
      return null;
    }
    if (!aptCtx.apartment) {
      setError(aptCtx.error || "Vui lòng kiểm tra lại mã căn hộ trước khi tạo tài khoản.");
      return null;
    }

    const needResidentInfo = () => {
      if (!/^(\d{9}|\d{12})$/.test(String(resForm.idCard).trim())) {
        setError("CCCD/CMND phải là 9 hoặc 12 chữ số.");
        return false;
      }
      if (!resForm.dateOfBirth) {
        setError("Vui lòng nhập ngày sinh của cư dân.");
        return false;
      }
      return true;
    };

    if (isOccupied) {
      if (resForm.linkMode === "link") {
        if (!resForm.linkResidentId) {
          setError("Vui lòng chọn nhân khẩu để gắn tài khoản.");
          return null;
        }
        return { linkResidentId: Number(resForm.linkResidentId) };
      }
      if (!needResidentInfo()) return null;
      return {
        idCard: resForm.idCard.trim(),
        dateOfBirth: resForm.dateOfBirth,
        gender: resForm.gender,
        relationToHead: resForm.relationToHead.trim() || "Thành viên",
        residencyStatus: resForm.residencyStatus,
      };
    }

    // Căn hộ trống -> lập hộ mới, cư dân làm chủ hộ.
    if (!resForm.newHouseholdCode.trim()) {
      setError("Vui lòng nhập mã hộ khẩu mới cho căn hộ trống.");
      return null;
    }
    if (!needResidentInfo()) return null;
    return {
      newHouseholdCode: resForm.newHouseholdCode.trim(),
      moveInDate: resForm.moveInDate || today(),
      idCard: resForm.idCard.trim(),
      dateOfBirth: resForm.dateOfBirth,
      gender: resForm.gender,
      residencyStatus: resForm.residencyStatus,
    };
  };

  const handleCreate = async () => {
    if (!validateCreateForm()) return;

    const residentPart = buildResidentPart();
    if (residentPart === null) return; // dữ liệu nhân khẩu chưa hợp lệ

    setSaving(true);
    setError("");
    const res = await createInternalAccountAPI({
      username: formData.username.trim(),
      password: formData.password,
      confirmPassword: formData.confirmPassword,
      fullName: formData.fullName.trim(),
      email: formData.email.trim(),
      phone: formData.phone.trim(),
      requestedApartmentCode: isAdminRole ? null : formData.apartment.trim() || null,
      role: formData.role,
      ...residentPart,
    });
    setSaving(false);

    if (!res.success) {
      // Hiển thị nguyên thông điệp lỗi từ backend (vd: email cần xác thực OTP trước).
      setError(res.message || "Tạo tài khoản thất bại.");
      return;
    }

    handleCancel();
    fetchUsers();
  };

  const handleUpdate = async () => {
    if (!selectedAccount?.id || !validateAccountInfo()) return;

    setSaving(true);
    setError("");
    const res = await updateUserAPI(selectedAccount.id, {
      username: formData.username.trim(),
      fullName: formData.fullName.trim(),
      email: formData.email.trim(),
      phone: formData.phone.trim(),
      requestedApartmentCode: isAdminRole ? "" : formData.apartment.trim() || null,
      role: formData.role,
    });
    setSaving(false);

    if (!res.success) {
      setError(res.message || "Cập nhật tài khoản thất bại.");
      return;
    }

    const updated = toRow(res.data);
    setSelectedAccount(updated);
    setRows((prev) => prev.map((row) => (row.id === updated.id ? updated : row)));
    setMode("view");
    showToast("Đã cập nhật thông tin tài khoản.", "green");
  };

  return (
    <>
      <SectionHeader
        title="Quản lý tài khoản"
        action={<Button onClick={openCreateForm}><Plus className="h-4 w-4" /> Tạo tài khoản</Button>}
      />

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 12 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl"
          >
            <h3 className="mb-4 text-xl font-black text-slate-900">
              {mode === "create" ? "Tạo tài khoản mới" : mode === "edit" ? "Chỉnh sửa tài khoản" : "Chi tiết tài khoản"}
            </h3>

            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <Input
                  label="Họ tên"
                  placeholder="Nguyễn Văn A"
                  value={formData.fullName}
                  disabled={mode === "view"}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                />
                <Select label="Vai trò" value={formData.role} disabled={mode === "view"} onChange={(e) => handleRoleChange(e.target.value)}>
                  <option value="ADMIN">Admin</option>
                  <option value="RESIDENT">Cư dân</option>
                </Select>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <Input
                  label="Email"
                  type="email"
                  placeholder="name@email.com"
                  value={formData.email}
                  disabled={mode === "view"}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
                <Input
                  label="Số điện thoại"
                  placeholder="09xxxxxxxx"
                  value={formData.phone}
                  disabled={mode === "view"}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <Input
                  label="Tên đăng nhập"
                  placeholder="Nhập tên đăng nhập"
                  value={formData.username}
                  disabled={mode === "view"}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                />
                <Input
                  label="Căn hộ"
                  placeholder={isAdminRole ? "Không áp dụng cho Admin" : "VD: A12-01"}
                  value={formData.apartment}
                  disabled={mode === "view" || isAdminRole}
                  onChange={(e) => {
                    setFormData({ ...formData, apartment: e.target.value });
                    // Mã căn hộ đổi -> bối cảnh cũ không còn đúng, đợi blur tra cứu lại.
                    if (mode === "create" && !isAdminRole) resetAptCtx();
                  }}
                  onBlur={() => {
                    if (mode === "create" && isResidentRole) loadApartmentContext(formData.apartment);
                  }}
                />
              </div>

              {/* ----- Gắn/tạo nhân khẩu cho tài khoản cư dân có căn hộ ----- */}
              {mode === "create" && isResidentRole && formData.apartment.trim() && (
                <div className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
                  {aptCtx.loading ? (
                    <div className="text-sm font-semibold text-slate-500">Đang kiểm tra căn hộ...</div>
                  ) : aptCtx.error ? (
                    <div className="rounded-xl bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 ring-1 ring-rose-200">
                      {aptCtx.error}
                    </div>
                  ) : isOccupied ? (
                    <>
                      <div className="rounded-xl bg-sky-50 px-4 py-3 text-sm text-sky-800 ring-1 ring-sky-200">
                        Căn hộ <b>{aptCtx.apartment.code}</b> đã có hộ <b>{aptCtx.household.code}</b>.
                      </div>
                      <Select label="Cách gắn cư dân" value={resForm.linkMode} onChange={(e) => setR({ linkMode: e.target.value })}>
                        <option value="link" disabled={activeResidents.length === 0}>
                          Gắn vào nhân khẩu có sẵn{activeResidents.length === 0 ? " (hộ chưa có nhân khẩu)" : ""}
                        </option>
                        <option value="new">Tạo nhân khẩu mới (thành viên hộ)</option>
                      </Select>
                      {resForm.linkMode === "link" ? (
                        <Select label="Nhân khẩu trong hộ" value={resForm.linkResidentId} onChange={(e) => setR({ linkResidentId: e.target.value })}>
                          <option value="">-- Chọn nhân khẩu --</option>
                          {activeResidents.map((r) => (
                            <option key={r.id} value={r.id}>
                              {r.fullName}{r.relationToHead ? ` (${r.relationToHead})` : ""}
                            </option>
                          ))}
                        </Select>
                      ) : (
                        <div className="grid gap-4 md:grid-cols-2">
                          <Input label="CCCD/CMND" placeholder="9 hoặc 12 chữ số" value={resForm.idCard} onChange={(e) => setR({ idCard: e.target.value })} />
                          <Input label="Ngày sinh" type="date" value={resForm.dateOfBirth} onChange={(e) => setR({ dateOfBirth: e.target.value })} />
                          <Select label="Giới tính" value={resForm.gender} onChange={(e) => setR({ gender: e.target.value })}>
                            <option value="MALE">Nam</option>
                            <option value="FEMALE">Nữ</option>
                            <option value="OTHER">Khác</option>
                          </Select>
                          <Input label="Quan hệ với chủ hộ" placeholder="VD: Con, Vợ, Chồng..." value={resForm.relationToHead} onChange={(e) => setR({ relationToHead: e.target.value })} />
                          <Select label="Diện cư trú" value={resForm.residencyStatus} onChange={(e) => setR({ residencyStatus: e.target.value })}>
                            <option value="PERMANENT">Thường trú</option>
                            <option value="TEMPORARY">Tạm trú</option>
                          </Select>
                        </div>
                      )}
                    </>
                  ) : aptCtx.apartment ? (
                    <>
                      <div className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800 ring-1 ring-amber-200">
                        Căn hộ <b>{aptCtx.apartment.code}</b> đang trống → sẽ lập <b>hộ mới</b>, cư dân làm <b>chủ hộ</b>.
                      </div>
                      <div className="grid gap-4 md:grid-cols-2">
                        <Input label="Mã hộ khẩu mới" placeholder="VD: HK001" value={resForm.newHouseholdCode} onChange={(e) => setR({ newHouseholdCode: e.target.value })} />
                        <Input label="Ngày chuyển đến" type="date" value={resForm.moveInDate} onChange={(e) => setR({ moveInDate: e.target.value })} />
                        <Input label="CCCD/CMND chủ hộ" placeholder="9 hoặc 12 chữ số" value={resForm.idCard} onChange={(e) => setR({ idCard: e.target.value })} />
                        <Input label="Ngày sinh" type="date" value={resForm.dateOfBirth} onChange={(e) => setR({ dateOfBirth: e.target.value })} />
                        <Select label="Giới tính" value={resForm.gender} onChange={(e) => setR({ gender: e.target.value })}>
                          <option value="MALE">Nam</option>
                          <option value="FEMALE">Nữ</option>
                          <option value="OTHER">Khác</option>
                        </Select>
                        <Select label="Diện cư trú" value={resForm.residencyStatus} onChange={(e) => setR({ residencyStatus: e.target.value })}>
                          <option value="PERMANENT">Thường trú</option>
                          <option value="TEMPORARY">Tạm trú</option>
                        </Select>
                      </div>
                    </>
                  ) : (
                    <div className="text-sm text-slate-500">Rời khỏi ô “Căn hộ” để kiểm tra và gắn nhân khẩu.</div>
                  )}
                </div>
              )}

              {mode === "create" && (
                <div className="grid gap-4 md:grid-cols-2">
                  <Input
                    label="Mật khẩu"
                    type="password"
                    placeholder="Tối thiểu 8 ký tự"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  />
                  <Input
                    label="Nhập lại mật khẩu"
                    type="password"
                    placeholder="Nhập lại mật khẩu"
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  />
                </div>
              )}

              {error && <div className="rounded-xl bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 ring-1 ring-rose-200">{error}</div>}

              <div className="flex items-center justify-between gap-3 pt-2">
                <div className="flex gap-2">
                  {mode === "view" && (
                    <>
                      <Button
                        variant="soft"
                        onClick={() => {
                          setError("");
                          setMode("edit");
                        }}
                      >
                        <Pencil className="h-4 w-4" /> Chỉnh sửa
                      </Button>
                      <Button
                        variant="secondary"
                        onClick={handleToggleLock}
                        disabled={toggling}
                      >
                        {selectedAccount?.active === "Khoá"
                          ? <><Unlock className="h-4 w-4" /> Mở khóa</>
                          : <><Lock className="h-4 w-4" /> Khóa</>}
                      </Button>
                      <Button variant="danger" onClick={() => setConfirmDelete(true)}>
                        <Trash2 className="h-4 w-4" /> Xóa tài khoản
                      </Button>
                    </>
                  )}
                </div>
                <div className="flex gap-3">
                  <Button variant="secondary" onClick={handleCancel}>Đóng</Button>
                  {mode === "create" && (
                    <Button onClick={handleCreate} disabled={saving}>{saving ? "Đang tạo..." : "Tạo tài khoản"}</Button>
                  )}
                  {mode === "edit" && (
                    <Button onClick={handleUpdate} disabled={saving}>
                      <Save className="h-4 w-4" /> {saving ? "Đang lưu..." : "Lưu thay đổi"}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {confirmDelete && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-xl"
          >
            <div className="mb-3 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-rose-50 text-rose-600">
                <Trash2 className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-black text-slate-900">Xác nhận xóa</h3>
            </div>
            <p className="mb-5 text-sm text-slate-600">
              Bạn có chắc chắn muốn xóa tài khoản
              {selectedAccount?.username ? ` "${selectedAccount.username}"` : ""} không?
              Hành động này không thể hoàn tác.
            </p>
            <div className="flex justify-end gap-3">
              <Button variant="secondary" onClick={() => setConfirmDelete(false)} disabled={deleting}>Hủy</Button>
              <Button variant="danger" onClick={handleDelete} disabled={deleting}>
                {deleting ? "Đang xóa..." : "Xóa"}
              </Button>
            </div>
          </motion.div>
        </div>
      )}

      {toast && (
        <div className={`mb-5 rounded-2xl px-4 py-3 text-sm font-semibold ring-1 ${
          toast.tone === "red"
            ? "bg-rose-50 text-rose-700 ring-rose-200"
            : "bg-emerald-50 text-emerald-700 ring-emerald-200"
        }`}>
          {toast.message}
        </div>
      )}

      <div className="relative mb-5 max-w-md flex-1">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          placeholder="Tìm username, họ tên, email, căn hộ..."
          value={searchKeyword}
          onChange={(e) => setSearchKeyword(e.target.value)}
          className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm outline-none focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
        />
      </div>

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
                <th className="px-5 py-4">Username</th>
                <th className="px-5 py-4">Họ tên</th>
                <th className="px-5 py-4">Email</th>
                <th className="px-5 py-4">SĐT</th>
                <th className="px-5 py-4">Căn hộ</th>
                <th className="px-5 py-4">Vai trò</th>
                <th className="px-5 py-4">Trạng thái</th>
                <th className="px-5 py-4 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={8} className="px-5 py-10 text-center text-slate-500">Đang tải danh sách...</td></tr>
              ) : filteredRows.length === 0 ? (
                <tr><td colSpan={8} className="px-5 py-10 text-center text-slate-500">Không có tài khoản nào</td></tr>
              ) : (
                pagedRows.map((row) => (
                  <tr key={row.id ?? row.username} className="hover:bg-slate-50/80">
                    <td className="whitespace-nowrap px-5 py-4 text-slate-700">{row.username}</td>
                    <td className="whitespace-nowrap px-5 py-4 text-slate-700">{row.fullName}</td>
                    <td className="whitespace-nowrap px-5 py-4 text-slate-700">{row.email || "—"}</td>
                    <td className="whitespace-nowrap px-5 py-4 text-slate-700">{row.phone || "—"}</td>
                    <td className="whitespace-nowrap px-5 py-4 text-slate-700">{row.apartment || "—"}</td>
                    <td className="whitespace-nowrap px-5 py-4"><Badge tone={row.role === "ADMIN" ? "blue" : "green"}>{row.role}</Badge></td>
                    <td className="whitespace-nowrap px-5 py-4"><Badge tone={row.active === "Khoá" ? "red" : "green"}>{row.active}</Badge></td>
                    <td className="px-5 py-4 text-right">
                      <button onClick={() => openDetail(row)} className="font-semibold text-sky-700 hover:text-sky-900">
                        Chi tiết
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {!loading && filteredRows.length > 0 && (
          <div className="border-t border-slate-200">
            <Pagination page={page} total={filteredRows.length} pageSize={PAGE_SIZE} onPageChange={setPage} />
          </div>
        )}
      </div>
    </>
  );
}
