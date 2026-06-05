import { useState } from "react";
import { motion } from "framer-motion";
import { Search, Plus } from "lucide-react";
import { useAppContext } from "../context/AppContext";
import { Badge, Button, Input, Select } from "../components/common";
import { SectionHeader } from "../components/layout/SectionHeader";

export function Accounts({ registrations = [] }) {
  const { users, setUsers } = useAppContext();
  const approvedRegistrationAccounts = registrations
    .filter((reg) => reg.status === "approved")
    .map((reg) => ({
      username: reg.username,
      password: reg.password || "",
      fullName: reg.fullName,
      name: reg.fullName,
      email: reg.email,
      phone: reg.phone,
      apartment: reg.apartment,
      role: "RESIDENT",
      active: "Hoạt động",
    }));

  const accountRows = [
    ...users.map((user) => ({
      ...user,
      fullName: user.fullName || user.name || user.username,
      active: user.active || "Hoạt động",
      apartment: user.apartment || "",
      phone: user.phone || "",
      email: user.email || "",
    })),
    ...approvedRegistrationAccounts.filter(
      (approved) => !users.some((user) => user.username === approved.username)
    ),
  ];

  const emptyForm = {
    fullName: "",
    username: "",
    password: "",
    confirmPassword: "",
    email: "",
    phone: "",
    apartment: "",
    role: "RESIDENT",
    active: "Hoạt động",
  };

  const [showForm, setShowForm] = useState(false);
  const [editingUsername, setEditingUsername] = useState(null);
  const [error, setError] = useState("");
  const [searchKeyword, setSearchKeyword] = useState("");
  const [formData, setFormData] = useState(emptyForm);

  const filteredRows = accountRows.filter((account) => {
    const keyword = searchKeyword.trim().toLowerCase();
    if (!keyword) return true;

    return (
      String(account.username || "").toLowerCase().includes(keyword) ||
      String(account.fullName || account.name || "").toLowerCase().includes(keyword) ||
      String(account.email || "").toLowerCase().includes(keyword) ||
      String(account.phone || "").toLowerCase().includes(keyword) ||
      String(account.apartment || "").toLowerCase().includes(keyword)
    );
  });

  const openCreateForm = () => {
    setFormData(emptyForm);
    setEditingUsername(null);
    setError("");
    setShowForm(true);
  };

  const openEditForm = (account) => {
    setFormData({
      fullName: account.fullName || account.name || "",
      username: account.username || "",
      password: "",
      confirmPassword: "",
      email: account.email || "",
      phone: account.phone || "",
      apartment: account.apartment || "",
      role: account.role || "RESIDENT",
      active: account.active || "Hoạt động",
    });
    setEditingUsername(account.username);
    setError("");
    setShowForm(true);
  };

  const handleCancel = () => {
    setFormData(emptyForm);
    setEditingUsername(null);
    setError("");
    setShowForm(false);
  };

  const validateAccountForm = () => {
    if (
      !formData.fullName.trim() ||
      !formData.username.trim() ||
      !formData.email.trim() ||
      !formData.phone.trim()
    ) {
      setError("Vui lòng nhập đầy đủ họ tên, username, email và số điện thoại");
      return false;
    }

    if (!editingUsername && !formData.password.trim()) {
      setError("Vui lòng nhập mật khẩu");
      return false;
    }

    if ((formData.password || formData.confirmPassword) && formData.password !== formData.confirmPassword) {
      setError("Mật khẩu nhập lại không khớp");
      return false;
    }

    const usernameExisted = users.some(
      (u) =>
        u.username?.toLowerCase() === formData.username.trim().toLowerCase() &&
        u.username !== editingUsername
    );

    if (usernameExisted) {
      setError("Tên đăng nhập đã tồn tại");
      return false;
    }

    return true;
  };

  const handleSave = () => {
    if (!validateAccountForm()) return;

    const cleanUsername = formData.username.trim();
    const savedAccount = {
      username: cleanUsername,
      fullName: formData.fullName.trim(),
      name: formData.fullName.trim(),
      email: formData.email.trim(),
      phone: formData.phone.trim(),
      apartment: formData.apartment.trim(),
      role: formData.role,
      active: formData.active,
    };

    if (formData.password.trim()) {
      savedAccount.password = formData.password.trim();
    }

    setUsers((prev) => {
      const existed = prev.some((u) => u.username === editingUsername || u.username === cleanUsername);
      if (!existed) {
        return [...prev, savedAccount];
      }

      return prev.map((u) => {
        if (u.username !== editingUsername && u.username !== cleanUsername) return u;

        return {
          ...u,
          ...savedAccount,
          password: formData.password.trim() ? formData.password.trim() : u.password,
        };
      });
    });

    handleCancel();
  };

  return (
    <>
      <SectionHeader
        title="Quản lý tài khoản"
        desc="Admin tạo, sửa, khoá/mở khoá và duyệt tài khoản cư dân đăng ký."
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
              {editingUsername ? "Chi tiết / chỉnh sửa tài khoản" : "Tạo tài khoản mới"}
            </h3>

            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <Input
                  label="Họ tên"
                  placeholder="Nguyễn Văn A"
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                />
                <Select label="Vai trò" value={formData.role} onChange={(e) => setFormData({ ...formData, role: e.target.value })}>
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
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
                <Input
                  label="Số điện thoại"
                  placeholder="09xxxxxxxx"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <Input
                  label="Tên đăng nhập"
                  placeholder="Nhập tên đăng nhập"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                />
                <Input
                  label="Căn hộ"
                  placeholder="VD: 1201"
                  value={formData.apartment}
                  onChange={(e) => setFormData({ ...formData, apartment: e.target.value })}
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <Input
                  label={editingUsername ? "Mật khẩu mới" : "Mật khẩu"}
                  type="password"
                  placeholder={editingUsername ? "Bỏ trống nếu không đổi" : "Nhập mật khẩu"}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                />
                <Input
                  label="Nhập lại mật khẩu"
                  type="password"
                  placeholder={editingUsername ? "Nhập lại mật khẩu mới" : "Nhập lại mật khẩu"}
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                />
              </div>

              <Select label="Trạng thái" value={formData.active} onChange={(e) => setFormData({ ...formData, active: e.target.value })}>
                <option>Hoạt động</option>
                <option>Khoá</option>
              </Select>

              {error && <div className="rounded-xl bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 ring-1 ring-rose-200">{error}</div>}

              <div className="flex justify-end gap-3 pt-2">
                <Button variant="secondary" onClick={handleCancel}>Hủy</Button>
                <Button onClick={handleSave}>{editingUsername ? "Lưu thay đổi" : "Tạo tài khoản"}</Button>
              </div>
            </div>
          </motion.div>
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
              {filteredRows.map((row) => (
                <tr key={row.username} className="hover:bg-slate-50/80">
                  <td className="whitespace-nowrap px-5 py-4 text-slate-700">{row.username}</td>
                  <td className="whitespace-nowrap px-5 py-4 text-slate-700">{row.fullName || row.name}</td>
                  <td className="whitespace-nowrap px-5 py-4 text-slate-700">{row.email || "__"}</td>
                  <td className="whitespace-nowrap px-5 py-4 text-slate-700">{row.phone || "__"}</td>
                  <td className="whitespace-nowrap px-5 py-4 text-slate-700">{row.apartment || "__"}</td>
                  <td className="whitespace-nowrap px-5 py-4"><Badge tone={row.role === "ADMIN" ? "blue" : "green"}>{row.role}</Badge></td>
                  <td className="whitespace-nowrap px-5 py-4"><Badge tone={row.active === "Khoá" ? "red" : "green"}>{row.active || "Hoạt động"}</Badge></td>
                  <td className="px-5 py-4 text-right">
                    <button onClick={() => openEditForm(row)} className="font-semibold text-sky-700 hover:text-sky-900">
                      Chi tiết
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

