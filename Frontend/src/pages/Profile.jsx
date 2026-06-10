import { useEffect, useState } from "react";
import { changePasswordAPI, updateProfileAPI, getProfileAPI } from "../api/authApi";
import { Button, Card, Input } from "../components/common";
import { SectionHeader } from "../components/layout/SectionHeader";
import { logError } from "../utils/logger";

export function Profile({ user, setUser }) {
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phone: "",
    apartment: "",
    oldPassword: "",
    newPassword: "",
    confirmNewPassword: "",
  });
  const [message, setMessage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Lấy thông tin hồ sơ đầy đủ từ backend: GET /api/me/profile
  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      const res = await getProfileAPI();
      if (active && res.success && res.data) {
        const p = res.data;
        setFormData((prev) => ({
          ...prev,
          fullName: p.fullName || "",
          email: p.email || "",
          phone: p.phone || "",
          apartment: p.apartmentCode || "",
        }));
        // Đồng bộ ngược lên AuthContext để header/menu hiển thị đúng.
        setUser?.((prev) => ({
          ...prev,
          fullName: p.fullName,
          name: p.fullName,
          email: p.email,
          phone: p.phone,
          apartment: p.apartmentCode,
        }));
      } else if (active && !res.success) {
        setMessage({ tone: "red", text: res.message || "Không tải được thông tin cá nhân." });
      }
      if (active) setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [setUser]);

  const handleSave = async () => {
    setMessage(null);

    if (!formData.phone.trim()) {
      setMessage({ tone: "red", text: "Vui lòng nhập số điện thoại." });
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
      // 1) Đổi mật khẩu: PUT /api/me/password
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

      // 2) Cập nhật hồ sơ: PUT /api/me/profile/update (backend chỉ nhận username + phone)
      const profileRes = await updateProfileAPI({
        username: user?.username,
        phone: formData.phone.trim(),
      });
      if (!profileRes.success) {
        setMessage({ tone: "red", text: profileRes.message || "Cập nhật thông tin thất bại." });
        return;
      }

      // 3) Đồng bộ hiển thị trên AuthContext.
      setUser?.((prev) => ({
        ...prev,
        phone: formData.phone.trim(),
      }));

      setFormData((prev) => ({
        ...prev,
        oldPassword: "",
        newPassword: "",
        confirmNewPassword: "",
      }));
      setMessage({
        tone: "green",
        text: wantChangePassword ? "Đã cập nhật thông tin và đổi mật khẩu thành công." : "Đã lưu thông tin cá nhân.",
      });
    } catch (err) {
      logError("Profile save error:", err);
      setMessage({ tone: "red", text: "Lỗi kết nối server. Vui lòng thử lại." });
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <SectionHeader title="Thông tin cá nhân" />
      <Card className="max-w-3xl">
        {loading ? (
          <div className="py-8 text-center text-slate-500">Đang tải thông tin...</div>
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-2">
              <Input label="Họ tên" value={formData.fullName} disabled className="opacity-80" />
              <Input label="Email" value={formData.email} disabled className="opacity-80" />
              <Input label="Số điện thoại" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} />
              <Input label="Căn hộ" value={formData.apartment} disabled className="opacity-80" />
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
          </>
        )}
      </Card>
    </>
  );
}
