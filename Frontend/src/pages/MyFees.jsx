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

export function MyFees({ user, paymentRecords = [] }) {
  const residentRoom = getResidentRoomByUser(user);
  const months = Array.from({ length: 12 }, (_, index) => index + 1);
  const years = [2025, 2026, 2027, 2028];
  const [filters, setFilters] = useState({ status: "ALL", month: "ALL", year: "ALL" });
  const [paymentBill, setPaymentBill] = useState(null);
  const [vehiclesList] = useDatabaseState("bluemoon_vehicles", initialVehicles);
  const [utilitiesList] = useDatabaseState("bluemoon_utilities", initialUtilities);
  const [unitPrices] = useDatabaseState("bluemoon_utility_prices", {
    ELECTRICITY: 3500,
    WATER: 7000,
    INTERNET: 220000,
  });
  const [householdPaymentStatus] = useDatabaseState("bluemoon_household_payment_status", {});

  const billRows = buildHouseholdBillRows({
    rooms: [residentRoom],
    paymentRecords,
    vehiclesList,
    utilitiesList,
    unitPrices,
    householdPaymentStatus,
    filters,
  });

  const summary = billRows.reduce(
    (acc, bill) => {
      acc.totalDue += Number(bill.amountDue || 0);
      acc.totalPaid += Number(bill.amountPaid || 0);
      if (bill.status === "PAID") acc.paid += 1;
      if (bill.status === "UNPAID") acc.unpaid += 1;
      return acc;
    },
    { totalDue: 0, totalPaid: 0, paid: 0, unpaid: 0 }
  );

  return (
    <>
      <SectionHeader
        title="Khoản phí của tôi"
        desc={`Hiển thị các khoản phí của căn hộ ${residentRoom}. Bấm Thanh toán để xem QR và thông tin chuyển khoản.`}
      />

      <div className="mb-5 grid gap-4 md:grid-cols-4">
        <Card><p className="text-sm font-semibold text-slate-500">Tổng phải nộp</p><p className="mt-2 text-2xl font-black">{money(summary.totalDue)}</p></Card>
        <Card><p className="text-sm font-semibold text-slate-500">Đã nộp</p><p className="mt-2 text-2xl font-black text-emerald-700">{money(summary.totalPaid)}</p></Card>
        <Card><p className="text-sm font-semibold text-slate-500">Còn thiếu</p><p className="mt-2 text-2xl font-black text-rose-700">{money(Math.max(0, summary.totalDue - summary.totalPaid))}</p></Card>
        <Card><p className="text-sm font-semibold text-slate-500">Hóa đơn chưa nộp</p><p className="mt-2 text-2xl font-black text-rose-700">{summary.unpaid}</p></Card>
      </div>

      <Card className="mb-5">
        <div className="grid gap-3 md:grid-cols-3">
          <Select label="Trạng thái" value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })}>
            <option value="ALL">Tất cả</option>
            <option value="PAID">Đã nộp</option>
            <option value="UNPAID">Chưa nộp</option>
          </Select>
          <Select label="Tháng" value={filters.month} onChange={(e) => setFilters({ ...filters, month: e.target.value })}>
            <option value="ALL">Tất cả tháng</option>
            {months.map((month) => <option key={month} value={month}>Tháng {month}</option>)}
          </Select>
          <Select label="Năm" value={filters.year} onChange={(e) => setFilters({ ...filters, year: e.target.value })}>
            <option value="ALL">Tất cả năm</option>
            {years.map((year) => <option key={year} value={year}>{year}</option>)}
          </Select>
        </div>
      </Card>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-5 py-4">Căn hộ</th>
                <th className="px-5 py-4">Chủ hộ</th>
                <th className="px-5 py-4">Kỳ thu</th>
                <th className="px-5 py-4">Cần đóng</th>
                <th className="px-5 py-4">Đã nộp</th>
                <th className="px-5 py-4">Trạng thái</th>
                <th className="px-5 py-4 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {billRows.map((bill) => (
                <tr key={bill.key} className="hover:bg-slate-50/80">
                  <td className="whitespace-nowrap px-5 py-4 font-semibold text-slate-800">{bill.room}</td>
                  <td className="whitespace-nowrap px-5 py-4 text-slate-700">{bill.owner}</td>
                  <td className="whitespace-nowrap px-5 py-4 text-slate-700">{getPeriodSummaryText(bill)}</td>
                  <td className="whitespace-nowrap px-5 py-4 text-slate-700">{money(bill.amountDue)}</td>
                  <td className="whitespace-nowrap px-5 py-4 text-slate-700">{money(bill.amountPaid)}</td>
                  <td className="whitespace-nowrap px-5 py-4"><StatusBadge status={bill.status} /></td>
                  <td className="px-5 py-4 text-right">
                    <button onClick={() => setPaymentBill(bill)} className="font-semibold text-sky-700 hover:text-sky-900">
                      Thanh toán
                    </button>
                  </td>
                </tr>
              ))}
              {billRows.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-5 py-10 text-center text-sm font-semibold text-slate-500">
                    Không có khoản phí nào phù hợp với bộ lọc.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {paymentBill && <PaymentQRModal bill={paymentBill} onClose={() => setPaymentBill(null)} />}
    </>
  );
}
