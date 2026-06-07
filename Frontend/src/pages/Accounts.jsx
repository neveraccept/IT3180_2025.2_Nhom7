import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Search, Plus, Trash2 } from "lucide-react";
import { getAllUsersAPI, createInternalAccountAPI, deleteUserAPI } from "../api/authApi";
import { Badge, Button, Input, Select, Pagination } from "../components/common";
import { SectionHeader } from "../components/layout/SectionHeader";

// Map UserDTO (backend) -> dòng hiển thị trên bảng.
const toRow = (dto) => ({
  id: dto.id,
  username: dto.username,
  fullName: dto.fullName || dto.username,
  email: dto.email || "",
  phone: dto.phone || "",
  // Backend chưa trả mã căn hộ thực tế trong UserDTO -> dùng mã đã khai khi đăng ký.
  apartment: dto.requestedApartmentCode || "",
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
  const [mode, setMode] = useState("create"); // "create" | "view"
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [searchKeyword, setSearchKeyword] = useState("");
  const [formData, setFormData] = useState(emptyForm);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 20;

  // Tài khoản đang xem chi tiết (cần id để gọi API xóa).
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [toast, setToast] = useState(null);

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

  const handleCancel = () => {
    setFormData(emptyForm);
    setError("");
    setShowForm(false);
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

  const handleCreate = async () => {
    if (!validateCreateForm()) return;

    setSaving(true);
    setError("");
    const res = await createInternalAccountAPI({
      username: formData.username.trim(),
      password: formData.password,
      confirmPassword: formData.confirmPassword,
      fullName: formData.fullName.trim(),
      email: formData.email.trim(),
      phone: formData.phone.trim(),
      requestedApartmentCode: formData.apartment.trim() || null,
      role: formData.role,
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

  return (
    <>
      <SectionHeader
        title="Quản lý tài khoản"
        desc="Admin xem danh sách và tạo tài khoản nội bộ."
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
              {mode === "view" ? "Chi tiết tài khoản" : "Tạo tài khoản mới"}
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
                <Select label="Vai trò" value={formData.role} disabled={mode === "view"} onChange={(e) => setFormData({ ...formData, role: e.target.value })}>
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
                  placeholder="VD: A12-01"
                  value={formData.apartment}
                  disabled={mode === "view"}
                  onChange={(e) => setFormData({ ...formData, apartment: e.target.value })}
                />
              </div>

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
                <div>
                  {mode === "view" && (
                    <Button variant="danger" onClick={() => setConfirmDelete(true)}>
                      <Trash2 className="h-4 w-4" /> Xóa tài khoản
                    </Button>
                  )}
                </div>
                <div className="flex gap-3">
                  <Button variant="secondary" onClick={handleCancel}>Đóng</Button>
                  {mode === "create" && (
                    <Button onClick={handleCreate} disabled={saving}>{saving ? "Đang tạo..." : "Tạo tài khoản"}</Button>
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
                    <td className="whitespace-nowrap px-5 py-4 text-slate-700">{row.email || "__"}</td>
                    <td className="whitespace-nowrap px-5 py-4 text-slate-700">{row.phone || "__"}</td>
                    <td className="whitespace-nowrap px-5 py-4 text-slate-700">{row.apartment || "__"}</td>
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
