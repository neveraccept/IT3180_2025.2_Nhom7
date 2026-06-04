import { useState } from "react";
import { getResidentRoomByUser } from "../utils/helpers";
import { changePasswordAPI, updateProfileAPI } from "../api/authApi";
import { useAppContext } from "../context/AppContext";
import { Button, Card, Input } from "../components/common";
import { SectionHeader } from "../components/layout/SectionHeader";

export function Profile({ user, setUser }) {
  const { users, setUsers } = useAppContext();
  const residentRoom = getResidentRoomByUser(user);
  const currentAccount = users.find((account) => account.username === user?.username) || {};
  const [formData, setFormData] = useState({
    fullName: currentAccount.fullName || currentAccount.name || user?.fullName || user?.name || "",
    email: currentAccount.email || user?.email || "",
    phone: currentAccount.phone || user?.phone || "",
    apartment: currentAccount.apartment || user?.apartment || residentRoom,
    oldPassword: "",
    newPassword: "",
    confirmNewPassword: "",
  });
  const [message, setMessage] = useState(null);

  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setMessage(null);

    if (!formData.fullName.trim() || !formData.email.trim() || !formData.phone.trim()) {
      setMessage({ tone: "red", text: "Vui lòng nhập đầy đủ họ tên, email và số điện thoại." });
      return;
    }

    const wantChangePassword = !!(formData.newPassword || formData.confirmNewPassword || formData.oldPassword);
    if (wantChangePassword) {
      if (!formData.oldPassword.trim()) {
        setMessage({ tone: "red", text: "Vui lòng nhập mật khẩu cũ khi đổi mật khẩu." });
        return;
      }
      if (formData.newPassword.length < 8) {
        setMessage({ tone: "red", text: "Mật khẩu mới phải có tối thiểu 8 ký tự." });
        return;
      }
      if (formData.newPassword !== formData.confirmNewPassword) {
        setMessage({ tone: "red", text: "Mật khẩu mới nhập lại không khớp." });
        return;
      }
    }

    setSaving(true);
    try {
      // 1) Đổi mật khẩu qua backend: PUT /api/auth/me/password
      if (wantChangePassword) {
        const res = await changePasswordAPI({
          oldPassword: formData.oldPassword,
          newPassword: formData.newPassword,
          confirmNewPassword: formData.confirmNewPassword,
        });
        if (!res.success) {
          setMessage({ tone: "red", text: res.message || "Đổi mật khẩu thất bại." });
          return;
        }
      }

      // 2) Cập nhật số điện thoại qua backend: PUT /api/auth/me/profile (chỉ nhận username + phone)
      const profileRes = await updateProfileAPI({
        username: user?.username,
        phone: formData.phone.trim(),
      });
      if (!profileRes.success) {
        setMessage({ tone: "red", text: profileRes.message || "Cập nhật thông tin thất bại." });
        return;
      }

      // 3) Đồng bộ hiển thị cục bộ (họ tên & email backend chưa hỗ trợ cập nhật ở API profile).
      const updatedAccount = {
        ...currentAccount,
        username: user?.username,
        role: user?.role || currentAccount.role || "RESIDENT",
        fullName: formData.fullName.trim(),
        name: formData.fullName.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        apartment: residentRoom,
        active: currentAccount.active || "Hoạt động",
      };
      setUsers((prev) => {
        const existed = prev.some((account) => account.username === user?.username);
        if (!existed) return [...prev, updatedAccount];
        return prev.map((account) => account.username === user?.username ? { ...account, ...updatedAccount } : account);
      });
      setUser?.((prev) => ({
        ...prev,
        fullName: updatedAccount.fullName,
        name: updatedAccount.name,
        email: updatedAccount.email,
        phone: updatedAccount.phone,
        apartment: residentRoom,
      }));

      setFormData((prev) => ({
        ...prev,
        oldPassword: "",
        newPassword: "",
        confirmNewPassword: "",
        apartment: residentRoom,
      }));
      setMessage({
        tone: "green",
        text: wantChangePassword ? "Đã cập nhật thông tin và đổi mật khẩu thành công." : "Đã lưu thông tin cá nhân.",
      });
    } catch (err) {
      console.error("Profile save error:", err);
      setMessage({ tone: "red", text: "Lỗi kết nối server. Vui lòng thử lại." });
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <SectionHeader title="Thông tin cá nhân" desc="Cập nhật thông tin cá nhân và đổi mật khẩu tài khoản. Căn hộ không được phép thay đổi." />
      <Card className="max-w-3xl">
        <div className="grid gap-4 md:grid-cols-2">
          <Input label="Họ tên" value={formData.fullName} onChange={(e) => setFormData({ ...formData, fullName: e.target.value })} />
          <Input label="Email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
          <Input label="Số điện thoại" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} />
          <Input label="Căn hộ" value={residentRoom} disabled className="opacity-80" />
          <Input label="Mật khẩu cũ" type="password" value={formData.oldPassword} onChange={(e) => setFormData({ ...formData, oldPassword: e.target.value })} />
          <Input label="Mật khẩu mới" type="password" value={formData.newPassword} onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })} />
          <Input label="Nhập lại mật khẩu mới" type="password" value={formData.confirmNewPassword} onChange={(e) => setFormData({ ...formData, confirmNewPassword: e.target.value })} />
        </div>

        {message && (
          <div className={`mt-5 rounded-xl px-4 py-3 text-sm font-semibold ring-1 ${message.tone === "red" ? "bg-rose-50 text-rose-700 ring-rose-200" : "bg-emerald-50 text-emerald-700 ring-emerald-200"}`}>
            {message.text}
          </div>
        )}

        <div className="mt-5 flex justify-end"><Button onClick={handleSave} disabled={saving}>{saving ? "Đang lưu..." : "Lưu thay đổi"}</Button></div>
      </Card>
    </>
  );
}

