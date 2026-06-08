import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Bell, Plus, CheckCircle2, AlertCircle, RefreshCw, Search } from "lucide-react";
import { Badge, Button, Card, Input, Select } from "../components/common";
import { SectionHeader } from "../components/layout/SectionHeader";
import {
  createNotificationAPI,
  listMyNotificationsAPI,
  listSentNotificationsAPI,
  markNotificationReadAPI,
  markNotificationUnreadAPI,
  SCOPE_LABEL,
} from "../api/notificationApi";
import { searchApartmentsAPI, getApartmentDetailAPI } from "../api/apartmentApi";

const floors = Array.from({ length: 30 }, (_, i) => i + 1);

const getFloorType = (floor) => {
  const f = Number(floor);
  if (f === 1) return "Kiot";
  if (f >= 2 && f <= 5) return "Tầng đế";
  if (f >= 6 && f <= 29) return "Tầng nhà ở";
  return "Penthouse";
};

const formatDate = (iso) => {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("vi-VN");
};

export function Notifications({
  role,
  initialNotificationId,
  onInitialNotificationHandled,
}) {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pageError, setPageError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Detail modal
  const [selectedNotificationId, setSelectedNotificationId] = useState(
    initialNotificationId || null
  );
  const [markingRead, setMarkingRead] = useState(false);

  // Compose form (Admin)
  const [showCompose, setShowCompose] = useState(false);
  const [composeData, setComposeData] = useState({
    title: "",
    content: "",
    scope: "ALL",
    floor: "1",
  });
  const [composeError, setComposeError] = useState("");
  const [sendLoading, setSendLoading] = useState(false);

  // BY_HOUSEHOLD: tìm kiếm căn hộ
  const [aptCodeInput, setAptCodeInput] = useState("");
  const [aptSearching, setAptSearching] = useState(false);
  const [foundHousehold, setFoundHousehold] = useState(null); // { householdId, householdCode, aptCode }
  const [aptSearchError, setAptSearchError] = useState("");

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    setPageError("");
    // Admin xem các thông báo mình đã gửi; cư dân xem thông báo nhận được.
    const res =
      role === "ADMIN" ? await listSentNotificationsAPI() : await listMyNotificationsAPI();
    if (res.success && res.data) {
      setNotifications(res.data.items || []);
    } else {
      setPageError(res.message || "Không tải được danh sách thông báo.");
      setNotifications([]);
    }
    setLoading(false);
  }, [role]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const selectedNotification = notifications.find((n) => n.id === selectedNotificationId) || null;

  const openNotificationDetail = async (item) => {
    setSelectedNotificationId(item.id);
    onInitialNotificationHandled?.();
    if (role === "ADMIN" || item.isRead) return;

    setNotifications((prev) =>
      prev.map((n) => (n.id === item.id ? { ...n, isRead: true } : n))
    );
    const res = await markNotificationReadAPI(item.id);
    if (!res.success) {
      setNotifications((prev) =>
        prev.map((n) => (n.id === item.id ? { ...n, isRead: false } : n))
      );
    }
  };

  const handleMarkUnread = async () => {
    if (!selectedNotification || role === "ADMIN") return;
    setMarkingRead(true);
    const res = await markNotificationUnreadAPI(selectedNotification.id);
    if (res.success) {
      setNotifications((prev) =>
        prev.map((n) => (n.id === selectedNotification.id ? { ...n, isRead: false, readAt: null } : n))
      );
      setSelectedNotificationId(null);
      onInitialNotificationHandled?.();
    }
    setMarkingRead(false);
  };

  useEffect(() => {
    if (!selectedNotification || role === "ADMIN" || selectedNotification.isRead) return;
    openNotificationDetail(selectedNotification);
  }, [selectedNotification?.id, role]);

  const closeDetail = () => {
    setSelectedNotificationId(null);
    onInitialNotificationHandled?.();
  };

  // Tìm hộ theo mã căn hộ (BY_HOUSEHOLD)
  const handleSearchApartment = async () => {
    if (!aptCodeInput.trim()) {
      setAptSearchError("Vui lòng nhập mã căn hộ");
      return;
    }
    setAptSearching(true);
    setAptSearchError("");
    setFoundHousehold(null);

    const searchRes = await searchApartmentsAPI({ code: aptCodeInput.trim(), size: 5 });
    if (!searchRes.success || !searchRes.data?.items?.length) {
      setAptSearchError("Không tìm thấy căn hộ với mã này.");
      setAptSearching(false);
      return;
    }

    const apt = searchRes.data.items[0];
    const detailRes = await getApartmentDetailAPI(apt.id);
    if (!detailRes.success || !detailRes.data?.currentHousehold) {
      setAptSearchError("Căn hộ này hiện không có hộ đang ở.");
      setAptSearching(false);
      return;
    }

    const hh = detailRes.data.currentHousehold;
    setFoundHousehold({
      householdId: hh.id,
      householdCode: hh.code,
      aptCode: apt.code,
    });
    setAptSearching(false);
  };

  const resetComposeForm = () => {
    setComposeData({ title: "", content: "", scope: "ALL", floor: "1" });
    setComposeError("");
    setAptCodeInput("");
    setFoundHousehold(null);
    setAptSearchError("");
  };

  const handleScopeChange = (value) => {
    setComposeData((prev) => ({ ...prev, scope: value }));
    setFoundHousehold(null);
    setAptCodeInput("");
    setAptSearchError("");
  };

  // Admin: gửi thông báo
  const handleSendNotification = async () => {
    if (!composeData.title.trim() || !composeData.content.trim()) {
      setComposeError("Vui lòng nhập tiêu đề và nội dung thông báo");
      return;
    }

    const payload = {
      title: composeData.title.trim(),
      content: composeData.content.trim(),
      scope: composeData.scope,
    };

    if (composeData.scope === "BY_FLOOR") {
      payload.floors = [parseInt(composeData.floor, 10)];
    } else if (composeData.scope === "BY_HOUSEHOLD") {
      if (!foundHousehold) {
        setComposeError("Vui lòng tìm và xác nhận căn hộ trước khi gửi.");
        return;
      }
      payload.householdIds = [foundHousehold.householdId];
    }

    setSendLoading(true);
    setComposeError("");
    const res = await createNotificationAPI(payload);
    if (res.success) {
      const recipientCount = res.data?.recipientCount ?? res.message?.match(/\d+/)?.[0];
      resetComposeForm();
      setShowCompose(false);
      await fetchNotifications();
      setSuccessMsg(
        `Đã gửi thông báo thành công${recipientCount ? ` tới ${recipientCount} người nhận` : ""}`
      );
      setTimeout(() => setSuccessMsg(""), 4000);
    } else {
      setComposeError(res.message || "Không thể gửi thông báo. Vui lòng thử lại.");
    }
    setSendLoading(false);
  };

  return (
    <>
      <SectionHeader
        title="Gửi/Xem thông báo"
        desc={
          role === "ADMIN"
            ? "Admin soạn thông báo cho cư dân và xem lại danh sách thông báo đã gửi."
            : "Cư dân xem thông báo nhận được từ Ban quản trị."
        }
        action={
          role === "ADMIN" ? (
            <Button onClick={() => setShowCompose(true)}>
              <Plus className="h-4 w-4" /> Soạn thông báo
            </Button>
          ) : null
        }
      />

      {/* Thông báo thành công */}
      {successMsg && (
        <div className="mb-4 rounded-xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700 ring-1 ring-emerald-200">
          {successMsg}
        </div>
      )}

      {/* Form soạn thông báo (Admin) */}
      {role === "ADMIN" && showCompose && (
        <Card className="mb-5">
          <h3 className="mb-4 text-lg font-black">Soạn thông báo mới</h3>
          <div className="space-y-4">
            <Input
              label="Tiêu đề"
              placeholder="Nhập tiêu đề thông báo"
              value={composeData.title}
              onChange={(e) => setComposeData({ ...composeData, title: e.target.value })}
            />

            <Select
              label="Phạm vi"
              value={composeData.scope}
              onChange={(e) => handleScopeChange(e.target.value)}
            >
              <option value="ALL">Toàn chung cư</option>
              <option value="BY_FLOOR">Theo tầng</option>
              <option value="BY_HOUSEHOLD">Theo hộ</option>
            </Select>

            {composeData.scope === "BY_FLOOR" && (
              <Select
                label="Chọn tầng"
                value={composeData.floor}
                onChange={(e) => setComposeData({ ...composeData, floor: e.target.value })}
              >
                {floors.map((f) => (
                  <option key={f} value={String(f)}>
                    Tầng {f} — {getFloorType(f)}
                  </option>
                ))}
              </Select>
            )}

            {composeData.scope === "BY_HOUSEHOLD" && (
              <div className="space-y-2">
                <span className="mb-1.5 block text-sm font-semibold text-slate-700">
                  Tìm căn hộ theo mã
                </span>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Nhập mã căn hộ (VD: A12-01)"
                    value={aptCodeInput}
                    onChange={(e) => {
                      setAptCodeInput(e.target.value);
                      setFoundHousehold(null);
                      setAptSearchError("");
                    }}
                    className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
                  />
                  <Button
                    variant="secondary"
                    onClick={handleSearchApartment}
                    disabled={aptSearching}
                  >
                    <Search className="h-4 w-4" />
                    {aptSearching ? "Đang tìm..." : "Tìm"}
                  </Button>
                </div>
                {aptSearchError && (
                  <p className="text-sm text-rose-600">{aptSearchError}</p>
                )}
                {foundHousehold && (
                  <div className="rounded-xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700 ring-1 ring-emerald-200">
                    Đã tìm thấy: Căn hộ {foundHousehold.aptCode} — Hộ{" "}
                    {foundHousehold.householdCode}
                  </div>
                )}
              </div>
            )}

            <label className="block">
              <span className="mb-1.5 block text-sm font-semibold text-slate-700">Nội dung</span>
              <textarea
                rows={5}
                value={composeData.content}
                onChange={(e) => setComposeData({ ...composeData, content: e.target.value })}
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
                placeholder="Nhập nội dung thông báo..."
              />
            </label>

            {composeError && (
              <div className="rounded-xl bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 ring-1 ring-rose-200">
                {composeError}
              </div>
            )}

            <div className="flex justify-end gap-3">
              <Button
                variant="secondary"
                onClick={() => {
                  resetComposeForm();
                  setShowCompose(false);
                }}
              >
                Hủy
              </Button>
              <Button onClick={handleSendNotification} disabled={sendLoading}>
                {sendLoading ? "Đang gửi..." : "Gửi thông báo"}
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Nút làm mới */}
      <div className="mb-3 flex justify-end">
        <Button variant="secondary" onClick={fetchNotifications} disabled={loading}>
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          {loading ? "Đang tải..." : "Làm mới"}
        </Button>
      </div>

      {/* Lỗi tải */}
      {pageError && (
        <div className="mb-4 rounded-xl bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 ring-1 ring-rose-200">
          {pageError}
        </div>
      )}

      {/* Danh sách thông báo */}
      <Card>
        <div className="space-y-3">
          {loading && (
            <p className="py-8 text-center text-sm font-semibold text-slate-500">Đang tải...</p>
          )}
          {!loading && notifications.length === 0 && (
            <p className="py-8 text-center text-sm font-semibold text-slate-500">
              Chưa có thông báo nào.
            </p>
          )}
          {!loading &&
            notifications.map((item) => (
              <button
                key={item.id}
                onClick={() => openNotificationDetail(item)}
                className="flex w-full items-start justify-between rounded-2xl border border-slate-200 p-4 text-left transition hover:bg-slate-50"
              >
                <div className="flex gap-3">
                  {role === "ADMIN" ? (
                    <Bell className="mt-1 h-5 w-5 text-sky-600" />
                  ) : item.isRead ? (
                    <CheckCircle2 className="mt-1 h-5 w-5 text-emerald-600" />
                  ) : (
                    <AlertCircle className="mt-1 h-5 w-5 text-sky-600" />
                  )}
                  <div>
                    <p className="font-black text-slate-900">{item.title}</p>
                    <p className="mt-1 text-sm text-slate-500">
                      {SCOPE_LABEL[item.scope] || item.scope} • {formatDate(item.sentAt)}
                      {item.senderName ? ` • ${item.senderName}` : ""}
                    </p>
                    {role === "ADMIN" && item.recipientCount != null && (
                      <p className="mt-0.5 text-xs text-slate-400">
                        {item.recipientCount} người nhận
                      </p>
                    )}
                  </div>
                </div>
                {role !== "ADMIN" && (
                  <Badge tone={item.isRead ? "green" : "blue"}>
                    {item.isRead ? "Đã đọc" : "Chưa đọc"}
                  </Badge>
                )}
              </button>
            ))}
        </div>
      </Card>

      {/* Modal chi tiết */}
      {selectedNotification && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={closeDetail}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            onClick={(e) => e.stopPropagation()}
            className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-3xl bg-white p-6 shadow-xl"
          >
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <h3 className="text-xl font-black text-slate-900">
                  {selectedNotification.title}
                </h3>
                <p className="mt-1 text-sm text-slate-500">
                  {SCOPE_LABEL[selectedNotification.scope] || selectedNotification.scope} •{" "}
                  {formatDate(selectedNotification.sentAt)}
                  {selectedNotification.senderName
                    ? ` • ${selectedNotification.senderName}`
                    : ""}
                </p>
              </div>
              {role !== "ADMIN" && (
                <Badge tone={selectedNotification.isRead ? "green" : "blue"}>
                  {selectedNotification.isRead ? "Đã đọc" : "Chưa đọc"}
                </Badge>
              )}
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-700 whitespace-pre-wrap">
              {selectedNotification.content}
            </div>

            <div className="mt-5 flex justify-end gap-3">
              <Button variant="secondary" onClick={closeDetail}>
                Đóng
              </Button>
              {role !== "ADMIN" && (
                <Button onClick={handleMarkUnread} disabled={markingRead}>
                  {markingRead ? "Đang đánh dấu..." : "Đánh dấu chưa đọc"}
                </Button>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </>
  );
}
