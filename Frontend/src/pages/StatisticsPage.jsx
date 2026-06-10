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

export function Statistics({ paymentRecords = [] }) {
  const getChargeMethodLabel = (method) => {
    if (method === "PER_M2") return "Theo m²";
    if (method === "FIXED") return "Cố định / hộ";
    if (method === "DONATION") return "Tự nguyện";
    return method || "__";
  };

  const totalDue = paymentRecords.reduce((sum, record) => sum + Number(record.amountDue || 0), 0);
  const totalPaid = paymentRecords.reduce((sum, record) => sum + Number(record.amountPaid || 0), 0);
  const totalMissing = Math.max(0, totalDue - totalPaid);

  const householdSummaries = Object.values(
    paymentRecords.reduce((acc, record) => {
      const key = record.room || "__";
      if (!acc[key]) {
        acc[key] = {
          room: record.room || "__",
          owner: record.owner || "__",
          amountDue: 0,
          amountPaid: 0,
        };
      }
      acc[key].amountDue += Number(record.amountDue || 0);
      acc[key].amountPaid += Number(record.amountPaid || 0);
      return acc;
    }, {})
  ).map((item) => ({
    ...item,
    missing: Math.max(0, item.amountDue - item.amountPaid),
    status: Number(item.amountPaid || 0) >= Number(item.amountDue || 0) && Number(item.amountDue || 0) > 0 ? "PAID" : "UNPAID",
  }));

  const escapeHtml = (value) =>
    String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");

  const exportPaymentInvoicesExcel = () => {
    if (!paymentRecords.length) {
      alert("Chưa có dữ liệu hóa đơn thu phí để xuất.");
      return;
    }

    const headers = [
      "STT",
      "Căn hộ",
      "Chủ hộ",
      "Tháng",
      "Năm",
      "Khoản thu",
      "Cách tính",
      "Diện tích (m²)",
      "Đơn giá",
      "Số tiền phải nộp",
      "Số tiền đã nộp",
      "Còn thiếu",
      "Trạng thái",
      "Ngày nộp",
      "Ghi chú",
    ];

    const rows = paymentRecords.map((record, index) => {
      const amountDue = Number(record.amountDue || 0);
      const amountPaid = Number(record.amountPaid || 0);
      return [
        index + 1,
        record.room || "__",
        record.owner || "__",
        record.month || "__",
        record.year || "__",
        record.feeName || "__",
        getChargeMethodLabel(record.chargeMethod),
        record.area || "__",
        Number(record.unitPrice || 0),
        amountDue,
        amountPaid,
        Math.max(0, amountDue - amountPaid),
        record.status === "PAID" ? "Đã nộp" : "Chưa nộp",
        record.paidDate || "__",
        record.note || "__",
      ];
    });

    const summaryRows = householdSummaries.map((item, index) => [
      index + 1,
      item.room,
      item.owner,
      item.amountDue,
      item.amountPaid,
      item.missing,
      item.status === "PAID" ? "Đã nộp" : "Chưa nộp",
    ]);

    const html = `
      <html>
        <head>
          <meta charset="utf-8" />
          <style>
            table { border-collapse: collapse; font-family: Arial, sans-serif; font-size: 12px; }
            th { background: #dbeafe; font-weight: bold; }
            th, td { border: 1px solid #94a3b8; padding: 6px 8px; }
            .title { font-size: 18px; font-weight: bold; background: #0ea5e9; color: white; }
            .section { font-weight: bold; background: #e2e8f0; }
          </style>
        </head>
        <body>
          <table>
            <tr><td class="title" colspan="15">BÁO CÁO HÓA ĐƠN THU PHÍ CHUNG CƯ BLUEMOON</td></tr>
            <tr><td colspan="15">Ngày xuất: ${escapeHtml(new Date().toLocaleString("vi-VN"))}</td></tr>
            <tr><td colspan="15"></td></tr>
            <tr><td class="section" colspan="15">TỔNG HỢP THEO HỘ</td></tr>
            <tr>${["STT", "Căn hộ", "Chủ hộ", "Tổng phải nộp", "Tổng đã nộp", "Còn thiếu", "Trạng thái"].map((h) => `<th>${escapeHtml(h)}</th>`).join("")}</tr>
            ${summaryRows.map((row) => `<tr>${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join("")}</tr>`).join("")}
            <tr><td colspan="15"></td></tr>
            <tr><td class="section" colspan="15">CHI TIẾT CÁC KHOẢN THU PHÍ</td></tr>
            <tr>${headers.map((h) => `<th>${escapeHtml(h)}</th>`).join("")}</tr>
            ${rows.map((row) => `<tr>${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join("")}</tr>`).join("")}
          </table>
        </body>
      </html>
    `;

    const blob = new Blob([html], { type: "application/vnd.ms-excel;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const dateText = new Date().toISOString().slice(0, 10);
    link.href = url;
    link.download = `hoa_don_thu_phi_bluemoon_${dateText}.xls`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <SectionHeader
        title="Thống kê và xuất file"
        desc="Thống kê hóa đơn thu phí của các hộ và xuất ra file Excel."
        action={
          <Button onClick={exportPaymentInvoicesExcel}>
            <Download className="h-4 w-4" /> Xuất Excel hóa đơn
          </Button>
        }
      />

      <Card className="mb-6">
        <div className="grid gap-4 md:grid-cols-4">
          <Select label="Loại báo cáo">
            <option>Hóa đơn thu phí các hộ</option>
          </Select>
          <Input label="Từ ngày" type="date" />
          <Input label="Đến ngày" type="date" />
          <Select label="Định dạng">
            <option>Excel</option>
          </Select>
        </div>
      </Card>

      <div className="mb-6 grid gap-4 md:grid-cols-3">
        <Card>
          <p className="text-sm font-semibold text-slate-500">Tổng phải thu</p>
          <p className="mt-2 text-3xl font-black">{money(totalDue)}</p>
        </Card>
        <Card>
          <p className="text-sm font-semibold text-slate-500">Đã thu</p>
          <p className="mt-2 text-3xl font-black text-emerald-700">{money(totalPaid)}</p>
        </Card>
        <Card>
          <p className="text-sm font-semibold text-slate-500">Còn thiếu</p>
          <p className="mt-2 text-3xl font-black text-rose-700">{money(totalMissing)}</p>
        </Card>
      </div>

      <Card>
        <h3 className="mb-4 text-lg font-black">Tổng hợp hóa đơn theo hộ</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-5 py-4">Căn hộ</th>
                <th className="px-5 py-4">Chủ hộ</th>
                <th className="px-5 py-4">Phải nộp</th>
                <th className="px-5 py-4">Đã nộp</th>
                <th className="px-5 py-4">Còn thiếu</th>
                <th className="px-5 py-4">Trạng thái</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {householdSummaries.map((item) => (
                <tr key={item.room} className="hover:bg-slate-50/80">
                  <td className="whitespace-nowrap px-5 py-4 font-semibold text-slate-800">{item.room}</td>
                  <td className="whitespace-nowrap px-5 py-4 text-slate-700">{item.owner}</td>
                  <td className="whitespace-nowrap px-5 py-4 text-slate-700">{money(item.amountDue)}</td>
                  <td className="whitespace-nowrap px-5 py-4 text-slate-700">{money(item.amountPaid)}</td>
                  <td className="whitespace-nowrap px-5 py-4 text-slate-700">{money(item.missing)}</td>
                  <td className="whitespace-nowrap px-5 py-4 text-slate-700"><StatusBadge status={item.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}
