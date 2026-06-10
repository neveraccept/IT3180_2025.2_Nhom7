import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Building2, Users, WalletCards, Car, Bike, ReceiptText, Bell, MessageSquareWarning, BarChart3, Home, ShieldCheck, Search, Plus, Download, LogOut, Menu, X, CheckCircle2, Clock3, AlertCircle, UserRoundCog, KeyRound, MapPin, Phone, Mail, CalendarDays, Sparkles, HeartHandshake, Dumbbell, Waves, Gamepad2, ShoppingCart, Trees
} from "lucide-react";
import { useAppContext } from "../context/AppContext";
import { useDatabaseState } from "../hooks/useDatabaseState";
import {
  adminNav,
  residentNav,
  apartments,
  residents,
  fees,
  payments,
  initialVehicles,
  initialUtilities,
  complaints,
  notifications,
  users,
  initialRegistrations,
  initialFeeCatalog,
} from "../data/mockData";
import {
  money,
  normalizeNotifications,
  getHouseholds,
  calculateMandatoryAmount,
  calculatePaymentStatus,
  makePaymentKey,
  buildPaymentRecordsForFee,
  buildInitialPaymentRecords,
  adminBankInfo,
  getResidentRoomByUser,
  getResidentDisplayName,
  parseNumberValue,
  getUtilityName,
  getUtilityUnitText,
  buildHouseholdBillRows,
  getPeriodSummaryText,
} from "../utils/helpers";
import {
  Badge,
  Button,
  Card,
  StatusBadge,
  DataTable,
  Input,
  Select,
  NotificationDetailModal,
  ComplaintReadOnlyModal,
  PaymentQRModal,
} from "../components/common";
import { SectionHeader } from "../components/layout/SectionHeader";
import { loginAPI, registerAPI, approveRegistrationAPI, rejectRegistrationAPI } from "../config/api";

export function Notifications({ role, notificationList, setNotificationList, initialNotificationId, onInitialNotificationHandled }) {
  const floors = Array.from({ length: 30 }, (_, index) => index + 1);

  const getFloorType = (floor) => {
    const floorNumber = Number(floor);
    if (floorNumber === 1) return "Kiot";
    if (floorNumber >= 2 && floorNumber <= 5) return "Tầng đế";
    if (floorNumber >= 6 && floorNumber <= 29) return "Tầng nhà ở";
    return "Penthouse";
  };

  const getRoomsByFloor = (floor) => {
    const floorNumber = Number(floor);
    return Array.from({ length: 10 }, (_, index) => {
      const roomNumber = String(index + 1).padStart(2, "0");
      if (floorNumber === 1) return `K${roomNumber}`;
      if (floorNumber >= 2 && floorNumber <= 5) return `D${floorNumber}${roomNumber}`;
      if (floorNumber === 30) return `PH${roomNumber}`;
      return `${floorNumber}${roomNumber}`;
    });
  };

  const firstFloor = "1";
  const firstRoom = getRoomsByFloor(firstFloor)[0];

  const [showCompose, setShowCompose] = useState(false);
  const [selectedNotificationId, setSelectedNotificationId] = useState(initialNotificationId || null);
  const [error, setError] = useState("");
  const [composeData, setComposeData] = useState({
    title: "",
    content: "",
    scope: "ALL",
    floor: firstFloor,
    room: firstRoom,
  });

  const selectedNotification = notificationList.find((item) => item.id === selectedNotificationId);

  const handleScopeChange = (value) => {
    const rooms = getRoomsByFloor(composeData.floor);
    setComposeData({
      ...composeData,
      scope: value,
      room: rooms[0],
    });
  };

  const handleFloorChange = (value) => {
    const rooms = getRoomsByFloor(value);
    setComposeData({
      ...composeData,
      floor: value,
      room: rooms[0],
    });
  };

  const getScopeLabel = () => {
    if (composeData.scope === "ALL") return "Toàn chung cư";
    if (composeData.scope === "FLOOR") {
      return `Tầng ${composeData.floor} - ${getFloorType(composeData.floor)}`;
    }
    return `Tầng ${composeData.floor} - ${getFloorType(composeData.floor)} • Phòng ${composeData.room}`;
  };

  const handleSendNotification = () => {
    if (!composeData.title.trim() || !composeData.content.trim()) {
      setError("Vui lòng nhập tiêu đề và nội dung thông báo");
      return;
    }

    const newNotification = {
      id: Date.now(),
      title: composeData.title.trim(),
      content: composeData.content.trim(),
      scope: getScopeLabel(),
      date: new Date().toLocaleDateString("vi-VN"),
      read: false,
    };

    setNotificationList((prev) => [newNotification, ...prev]);
    setComposeData({
      title: "",
      content: "",
      scope: "ALL",
      floor: firstFloor,
      room: firstRoom,
    });
    setError("");
    setShowCompose(false);
  };

  const handleCancelCompose = () => {
    setComposeData({
      title: "",
      content: "",
      scope: "ALL",
      floor: firstFloor,
      room: firstRoom,
    });
    setError("");
    setShowCompose(false);
  };

  const closeDetail = () => {
    setSelectedNotificationId(null);
    onInitialNotificationHandled?.();
  };

  const handleToggleRead = () => {
    if (!selectedNotification) return;

    setNotificationList((prev) =>
      prev.map((item) =>
        item.id === selectedNotification.id
          ? { ...item, read: !selectedNotification.read }
          : item
      )
    );
    setSelectedNotificationId(null);
    onInitialNotificationHandled?.();
  };

  return (
    <>
      <SectionHeader
        title="Gửi/Xem thông báo"
        desc={role === "ADMIN" ? "Admin soạn thông báo và xem lại danh sách thông báo đã gửi." : "Cư dân xem thông báo nhận được từ Ban quản trị."}
        action={
          role === "ADMIN" ? (
            <Button onClick={() => setShowCompose(true)}>
              <Plus className="h-4 w-4" /> Soạn thông báo
            </Button>
          ) : null
        }
      />

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
              <option value="FLOOR">Theo tầng</option>
              <option value="APARTMENT">Theo hộ</option>
            </Select>

            {composeData.scope === "FLOOR" && (
              <Select
                label="Chọn tầng"
                value={composeData.floor}
                onChange={(e) => handleFloorChange(e.target.value)}
              >
                {floors.map((floor) => (
                  <option key={floor} value={floor}>
                    Tầng {floor} - {getFloorType(floor)}
                  </option>
                ))}
              </Select>
            )}

            {composeData.scope === "APARTMENT" && (
              <div className="grid gap-4 md:grid-cols-2">
                <Select
                  label="Chọn tầng"
                  value={composeData.floor}
                  onChange={(e) => handleFloorChange(e.target.value)}
                >
                  {floors.map((floor) => (
                    <option key={floor} value={floor}>
                      Tầng {floor} - {getFloorType(floor)}
                    </option>
                  ))}
                </Select>

                <Select
                  label="Chọn phòng"
                  value={composeData.room}
                  onChange={(e) => setComposeData({ ...composeData, room: e.target.value })}
                >
                  {getRoomsByFloor(composeData.floor).map((room) => (
                    <option key={room} value={room}>
                      Phòng {room}
                    </option>
                  ))}
                </Select>
              </div>
            )}

            <label className="block">
              <span className="mb-1.5 block text-sm font-semibold text-slate-700">
                Nội dung
              </span>
              <textarea
                rows={5}
                value={composeData.content}
                onChange={(e) => setComposeData({ ...composeData, content: e.target.value })}
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
                placeholder="Nhập nội dung thông báo..."
              />
            </label>

            {error && (
              <div className="rounded-xl bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 ring-1 ring-rose-200">
                {error}
              </div>
            )}

            <div className="flex justify-end gap-3">
              <Button variant="secondary" onClick={handleCancelCompose}>Hủy</Button>
              <Button onClick={handleSendNotification}>Gửi thông báo</Button>
            </div>
          </div>
        </Card>
      )}

      <Card>
        <div className="space-y-3">
          {notificationList.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                setSelectedNotificationId(item.id);
                onInitialNotificationHandled?.();
              }}
              className="flex w-full items-start justify-between rounded-2xl border border-slate-200 p-4 text-left transition hover:bg-slate-50"
            >
              <div className="flex gap-3">
                {role === "ADMIN" ? (
                  <Bell className="mt-1 h-5 w-5 text-sky-600" />
                ) : item.read ? (
                  <CheckCircle2 className="mt-1 h-5 w-5 text-emerald-600" />
                ) : (
                  <AlertCircle className="mt-1 h-5 w-5 text-sky-600" />
                )}
                <div>
                  <p className="font-black text-slate-900">{item.title}</p>
                  <p className="mt-1 text-sm text-slate-500">
                    {item.scope} • {item.date}
                  </p>
                </div>
              </div>
              {role !== "ADMIN" && (
                <Badge tone={item.read ? "green" : "blue"}>
                  {item.read ? "Đã đọc" : "Chưa đọc"}
                </Badge>
              )}
            </button>
          ))}
        </div>
      </Card>

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
                  {selectedNotification.scope} • {selectedNotification.date}
                </p>
              </div>
              {role !== "ADMIN" && (
                <Badge tone={selectedNotification.read ? "green" : "blue"}>
                  {selectedNotification.read ? "Đã đọc" : "Chưa đọc"}
                </Badge>
              )}
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-700">
              {selectedNotification.content}
            </div>

            <div className="mt-5 flex justify-end gap-3">
              <Button variant="secondary" onClick={closeDetail}>
                Đóng
              </Button>
              {role !== "ADMIN" && (
                <Button onClick={handleToggleRead}>
                  {selectedNotification.read ? "Đánh dấu là chưa đọc" : "Đã đọc"}
                </Button>
              )}
            </div>


          </motion.div>
        </div>
      )}
    </>
  );
}
