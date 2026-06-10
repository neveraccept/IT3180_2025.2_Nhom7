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

export function Dashboard({ role, user, paymentRecords = [], complaintsList = complaints, notificationList = normalizeNotifications(notifications) }) {
  const unresolvedComplaints = complaintsList.filter((c) => c.status === "IN_PROGRESS");
  const unreadNotifications = notificationList.filter((item) => !item.read);
  const [dashboardComplaintId, setDashboardComplaintId] = useState(null);
  const [dashboardNotificationId, setDashboardNotificationId] = useState(null);

  const selectedDashboardComplaint = complaintsList.find((item) => item.id === dashboardComplaintId);
  const selectedDashboardNotification = notificationList.find((item) => item.id === dashboardNotificationId);

  const closeDashboardModal = () => {
    setDashboardComplaintId(null);
    setDashboardNotificationId(null);
  };


  const [dashboardPaymentBill, setDashboardPaymentBill] = useState(null);
  const [vehiclesList] = useDatabaseState("bluemoon_vehicles", initialVehicles);
  const [utilitiesList] = useDatabaseState("bluemoon_utilities", initialUtilities);
  const [unitPrices] = useDatabaseState("bluemoon_utility_prices", {
    ELECTRICITY: 3500,
    WATER: 7000,
    INTERNET: 220000,
  });
  const [householdPaymentStatus] = useDatabaseState("bluemoon_household_payment_status", {});
  const residentRoom = getResidentRoomByUser(user);
  const residentBills = buildHouseholdBillRows({
    rooms: [residentRoom],
    paymentRecords,
    vehiclesList,
    utilitiesList,
    unitPrices,
    householdPaymentStatus,
    filters: { status: "ALL", month: "ALL", year: "ALL" },
  });
  const unpaidResidentBills = residentBills.filter((bill) => bill.status === "UNPAID");

  if (role !== "ADMIN") {
    return (
      <>
        <SectionHeader title="Dashboard cư dân" desc="Các khoản phí chưa nộp và thông báo mới nhất của hộ cư dân." />

        <div className="mb-6 grid gap-4 md:grid-cols-2">
          <Card>
            <p className="text-sm font-semibold text-slate-500">Căn hộ</p>
            <p className="mt-2 text-3xl font-black text-slate-950">{residentRoom}</p>
            <p className="mt-1 text-xs text-slate-500">{getResidentDisplayName(user)}</p>
          </Card>
          <Card>
            <p className="text-sm font-semibold text-slate-500">Tổng chưa nộp</p>
            <p className="mt-2 text-3xl font-black text-rose-700">
              {money(unpaidResidentBills.reduce((sum, bill) => sum + Math.max(0, bill.amountDue - bill.amountPaid), 0))}
            </p>
            <p className="mt-1 text-xs text-slate-500">{unpaidResidentBills.length} khoản/hóa đơn cần thanh toán</p>
          </Card>
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <Card>
            <h3 className="mb-4 text-lg font-black">Các khoản phí chưa nộp</h3>
            <div className="space-y-3">
              {unpaidResidentBills.length === 0 ? (
                <div className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700 ring-1 ring-emerald-200">
                  ✓ Hộ của bạn không còn khoản phí chưa nộp.
                </div>
              ) : (
                unpaidResidentBills.map((bill) => (
                  <button
                    key={bill.key}
                    onClick={() => setDashboardPaymentBill(bill)}
                    className="flex w-full items-start justify-between gap-4 rounded-2xl border border-slate-200 p-4 text-left transition hover:bg-slate-50"
                  >
                    <div>
                      <p className="font-black text-slate-900">Căn hộ {bill.room}</p>
                      <p className="mt-1 text-sm text-slate-500">{getPeriodSummaryText(bill)}</p>
                      <p className="mt-2 text-sm font-semibold text-rose-700">Cần nộp: {money(Math.max(0, bill.amountDue - bill.amountPaid))}</p>
                    </div>
                    <Badge tone="red">Chưa nộp</Badge>
                  </button>
                ))
              )}
            </div>
          </Card>

          <Card>
            <h3 className="mb-4 text-lg font-black">Thông báo</h3>
            <div className="space-y-3">
              {notificationList.map((n) => (
                <button
                  key={n.id || n.title}
                  onClick={() => setDashboardNotificationId(n.id)}
                  className="flex w-full gap-3 rounded-2xl bg-slate-50 p-4 text-left transition hover:bg-slate-100"
                >
                  {n.read ? <CheckCircle2 className="mt-1 h-5 w-5 text-emerald-600" /> : <Bell className="mt-1 h-5 w-5 text-sky-600" />}
                  <div className="min-w-0">
                    <p className="font-bold text-slate-800">{n.title}</p>
                    <p className="text-sm text-slate-500">{n.scope} • {n.date}</p>
                  </div>
                </button>
              ))}
            </div>
          </Card>
        </div>

        {dashboardPaymentBill && <PaymentQRModal bill={dashboardPaymentBill} onClose={() => setDashboardPaymentBill(null)} />}
        {selectedDashboardNotification && <NotificationDetailModal notification={selectedDashboardNotification} onClose={closeDashboardModal} />}
      </>
    );
  }

  const cards = role === "ADMIN"
    ? [
      { label: "Căn hộ đang ở", value: "218", icon: Building2, tone: "text-sky-700", sub: "12 căn trống" },
      { label: "Nhân khẩu", value: "726", icon: Users, tone: "text-emerald-700", sub: "18 tạm trú" },
      { label: "Đợt thu mở", value: "4", icon: WalletCards, tone: "text-violet-700", sub: "2 bắt buộc" },
      { label: "Khiếu nại đang xử lý", value: String(unresolvedComplaints.length), icon: MessageSquareWarning, tone: "text-rose-700", sub: "Cần xử lý" },
    ]
    : [
      { label: "Khoản cần nộp", value: money(452000), icon: WalletCards, tone: "text-rose-700", sub: "Tháng 05/2026" },
      { label: "Thông báo chưa đọc", value: String(unreadNotifications.length), icon: Bell, tone: "text-sky-700", sub: "Từ BQT" },
      { label: "Khiếu nại đang xử lý", value: String(unresolvedComplaints.length), icon: Clock3, tone: "text-amber-700", sub: "Theo dõi xử lý" },
    ];

  return (
    <>
      <SectionHeader title="Dashboard" desc={role === "ADMIN" ? "Tổng quan vận hành và thu phí của chung cư BlueMoon." : "Thông tin phí, thông báo và khiếu nại của hộ dân."} />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <Card key={card.label}>
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-500">{card.label}</p>
                  <p className="mt-2 text-3xl font-black text-slate-950">{card.value}</p>
                  <p className="mt-1 text-xs text-slate-500">{card.sub}</p>
                </div>
                <div className={`rounded-2xl bg-slate-50 p-3 ${card.tone}`}><Icon className="h-6 w-6" /></div>
              </div>
            </Card>
          );
        })}
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <Card>
          <h3 className="mb-4 text-lg font-black">Khiếu nại chưa xử lý</h3>
          <div className="space-y-3">
            {unresolvedComplaints.length === 0 ? (
              <div className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">✓ Không có khiếu nại chưa xử lý</div>
            ) : (
              unresolvedComplaints.map((c) => (
                <button
                  key={c.id}
                  onClick={() => {
                    setDashboardComplaintId(c.id);
                    setDashboardNotificationId(null);
                  }}
                  className="flex w-full gap-3 rounded-2xl border border-slate-200 p-4 text-left transition hover:bg-slate-50"
                >
                  <MessageSquareWarning className="mt-1 h-5 w-5 flex-shrink-0 text-amber-600" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-bold text-slate-900">{c.title}</p>
                        <p className="text-sm text-slate-500">{c.id} • {c.sender}</p>
                      </div>
                      <StatusBadge status={c.status} />
                    </div>
                    <p className="mt-2 text-xs font-medium text-slate-600">Danh mục: {c.category}</p>
                  </div>
                </button>
              ))
            )}
          </div>
        </Card>
        <Card>
          <h3 className="mb-4 text-lg font-black">Thông báo gần đây</h3>
          <div className="space-y-3">
            {notificationList.map((n) => (
              <button
                key={n.id || n.title}
                onClick={() => {
                  setDashboardNotificationId(n.id);
                  setDashboardComplaintId(null);
                }}
                className="flex w-full gap-3 rounded-2xl bg-slate-50 p-4 text-left transition hover:bg-slate-100"
              >
                <Bell className="mt-1 h-5 w-5 text-sky-600" />
                <div className="min-w-0">
                  <p className="font-bold text-slate-800">{n.title}</p>
                  <p className="text-sm text-slate-500">{n.scope} • {n.date}</p>
                </div>
              </button>
            ))}
          </div>
        </Card>
      </div>

      {selectedDashboardComplaint && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={closeDashboardModal}
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
                  {selectedDashboardComplaint.title}
                </h3>
                <p className="mt-1 text-sm text-slate-500">
                  {selectedDashboardComplaint.id} • {selectedDashboardComplaint.sender}
                </p>
              </div>
              <StatusBadge status={selectedDashboardComplaint.status} />
            </div>

            <div className="space-y-4">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Danh mục</p>
                <p className="mt-1 text-sm font-semibold text-slate-800">{selectedDashboardComplaint.category}</p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Nội dung khiếu nại</p>
                <p className="mt-2 text-sm leading-6 text-slate-700">{selectedDashboardComplaint.content}</p>
              </div>

              {selectedDashboardComplaint.response && (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                  <p className="text-xs font-bold uppercase tracking-wide text-emerald-700">Nội dung xử lý</p>
                  <p className="mt-2 text-sm leading-6 text-emerald-800">{selectedDashboardComplaint.response}</p>
                </div>
              )}
            </div>

            <div className="mt-5 flex justify-end">
              <Button variant="secondary" onClick={closeDashboardModal}>
                Đóng
              </Button>
            </div>
          </motion.div>
        </div>
      )}

      {selectedDashboardNotification && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={closeDashboardModal}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            onClick={(e) => e.stopPropagation()}
            className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-3xl bg-white p-6 shadow-xl"
          >
            <div className="mb-4">
              <h3 className="text-xl font-black text-slate-900">
                {selectedDashboardNotification.title}
              </h3>
              <p className="mt-1 text-sm text-slate-500">
                {selectedDashboardNotification.scope} • {selectedDashboardNotification.date}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-700">
              {selectedDashboardNotification.content}
            </div>

            <div className="mt-5 flex justify-end">
              <Button variant="secondary" onClick={closeDashboardModal}>
                Đóng
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </>
  );
}
