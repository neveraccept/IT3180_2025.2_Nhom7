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

export function Payments({ feesList, paymentRecords, setPaymentRecords }) {
  const mandatoryFees = feesList.filter((fee) => fee.type === "MANDATORY" && fee.status === "ACTIVE");
  const months = Array.from({ length: 12 }, (_, index) => index + 1);
  const years = [2025, 2026, 2027, 2028];
  const [showBatchForm, setShowBatchForm] = useState(false);
  const [showOnlyUnpaid, setShowOnlyUnpaid] = useState(false);
  const [selectedBill, setSelectedBill] = useState(null);
  const [paymentForm, setPaymentForm] = useState({ amountPaid: "", paidDate: "", note: "" });
  const [historyTarget, setHistoryTarget] = useState(null);
  const [error, setError] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [confirmBatchData, setConfirmBatchData] = useState(null);
  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();
  const [filters, setFilters] = useState({ room: "", status: "ALL", month: String(currentMonth), year: String(currentYear) });
  const [batchType, setBatchType] = useState("mandatory");
  const [batchData, setBatchData] = useState({
    feeId: mandatoryFees[0]?.id || "",
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
  });

  // Đọc các dữ liệu đã thêm ở các màn hình khác từ database mô phỏng.
  const [vehiclesList] = useDatabaseState("bluemoon_vehicles", initialVehicles);
  const [utilitiesList] = useDatabaseState("bluemoon_utilities", initialUtilities);
  const [unitPrices] = useDatabaseState("bluemoon_utility_prices", {
    ELECTRICITY: 3500,
    WATER: 7000,
    INTERNET: 220000,
  });
  const [householdPaymentStatus, setHouseholdPaymentStatus] = useDatabaseState("bluemoon_household_payment_status", {});

  const getFee = (feeId) => feesList.find((fee) => fee.id === feeId);
  const getPaymentStatusLabel = (status) => status === "PAID" ? "Đã nộp" : "Chưa nộp";
  const getPaymentStatusTone = (status) => status === "PAID" ? "green" : "red";
  const makeBillKey = (room) => String(room);
  const makePeriodKey = (month, year) => `${month}/${year}`;
  const parseNumber = (value) => {
    if (value === "__") return 0;
    const number = Number(value);
    return Number.isNaN(number) ? 0 : number;
  };

  const getUtilityLabel = (type) => {
    if (type === "ELECTRICITY") return "Điện";
    if (type === "WATER") return "Nước";
    if (type === "INTERNET") return "Internet";
    return type;
  };

  const getUtilityUnitLabel = (type) => {
    if (type === "ELECTRICITY") return "đ/số";
    if (type === "WATER") return "đ/m³";
    return "đ/tháng";
  };

  const calculateUtilityAmount = (utility) => {
    if (utility.type === "INTERNET") return parseNumber(unitPrices.INTERNET);
    return Math.max(0, parseNumber(utility.newIndex) - parseNumber(utility.oldIndex)) * parseNumber(unitPrices[utility.type]);
  };

  const matchesSelectedPeriod = (month, year) => {
    if (filters.month !== "ALL" && Number(month) !== Number(filters.month)) return false;
    if (filters.year !== "ALL" && Number(year) !== Number(filters.year)) return false;
    return true;
  };

  const buildBillItemsForPeriod = (room, month, year) => {
    const period = makePeriodKey(month, year);

    const feeItems = paymentRecords
      .filter((record) => record.room === room && Number(record.month) === Number(month) && Number(record.year) === Number(year))
      .map((record) => ({
        id: record.id,
        period,
        group: record.feeName?.toLowerCase().includes("phòng") ? "Tiền phòng" : "Khoản thu bắt buộc",
        name: record.feeName,
        formula: record.chargeMethod === "PER_M2"
          ? `${record.area || 0} m² × ${new Intl.NumberFormat("vi-VN").format(record.unitPrice || 0)} đ/m²`
          : `Cố định ${money(record.unitPrice || record.amountDue || 0)}`,
        amountDue: Number(record.amountDue || 0),
      }));

    const currentMonth = new Date().getMonth() + 1;
    const currentYear = new Date().getFullYear();
    const vehicleItems = Number(month) === Number(currentMonth) && Number(year) === Number(currentYear)
      ? vehiclesList
          .filter((vehicle) => vehicle.room === room)
          .map((vehicle) => ({
            id: `VEHICLE-${vehicle.plate}-${vehicle.slot}-${room}-${month}-${year}`,
            period,
            group: "Gửi xe",
            name: `${vehicle.type}${vehicle.plate && vehicle.plate !== "__" ? ` - ${vehicle.plate}` : ""} (${vehicle.slot})`,
            formula: `${new Intl.NumberFormat("vi-VN").format(Number(vehicle.fee || 0))} đ/tháng`,
            amountDue: Number(vehicle.fee || 0),
          }))
      : [];

    const utilityItems = utilitiesList
      .filter((utility) => utility.room === room && Number(utility.month) === Number(month) && Number(utility.year) === Number(year))
      .map((utility) => {
        const amountDue = calculateUtilityAmount(utility);
        const formula = utility.type === "INTERNET"
          ? `${new Intl.NumberFormat("vi-VN").format(unitPrices.INTERNET || 0)} đ/tháng`
          : `(${utility.newIndex} - ${utility.oldIndex}) × ${new Intl.NumberFormat("vi-VN").format(unitPrices[utility.type] || 0)} ${getUtilityUnitLabel(utility.type)}`;

        return {
          id: `UTILITY-${utility.id}`,
          period,
          group: "Điện/Nước/Internet",
          name: getUtilityLabel(utility.type),
          formula,
          amountDue,
        };
      });

    return [...feeItems, ...vehicleItems, ...utilityItems];
  };

  const getPeriodsForRoom = (room) => {
    const periods = new Set();
    const currentMonth = new Date().getMonth() + 1;
    const currentYear = new Date().getFullYear();

    paymentRecords
      .filter((record) => record.room === room)
      .forEach((record) => periods.add(`${record.month}|${record.year}`));

    utilitiesList
      .filter((utility) => utility.room === room)
      .forEach((utility) => periods.add(`${utility.month}|${utility.year}`));

    if (vehiclesList.some((vehicle) => vehicle.room === room)) {
      periods.add(`${currentMonth}|${currentYear}`);
    }

    return Array.from(periods)
      .map((periodKey) => {
        const [month, year] = periodKey.split("|");
        return { month: Number(month), year: Number(year) };
      })
      .filter(({ month, year }) => matchesSelectedPeriod(month, year))
      .sort((a, b) => Number(a.year) - Number(b.year) || Number(a.month) - Number(b.month));
  };

  const householdRows = useMemo(() => {
    const rooms = new Set();
    paymentRecords.forEach((record) => rooms.add(record.room));
    utilitiesList.forEach((utility) => rooms.add(utility.room));
    vehiclesList.forEach((vehicle) => rooms.add(vehicle.room));

    return Array.from(rooms)
      .map((room) => {
        const household = getHouseholds().find((item) => item.room === room);
        const fallbackRecord = paymentRecords.find((record) => record.room === room);
        const periods = getPeriodsForRoom(room);
        const items = periods.flatMap(({ month, year }) => buildBillItemsForPeriod(room, month, year));
        const totalAmountDue = items.reduce((sum, item) => sum + Number(item.amountDue || 0), 0);
        const rowKey = makeBillKey(room);
        const savedPayment = householdPaymentStatus[rowKey];
        
        // Tính dư từ các tháng trước tháng được chọn
        const selectedMonth = Number(filters.month);
        const selectedYear = Number(filters.year);
        const previousRecords = paymentRecords.filter((record) => 
          record.room === room && 
          (Number(record.year) < selectedYear || 
           (Number(record.year) === selectedYear && Number(record.month) < selectedMonth))
        );
        const previousDue = previousRecords.reduce((sum, record) => sum + Number(record.amountDue || 0), 0);
        const previousPaid = previousRecords.reduce((sum, record) => sum + Number(record.amountPaid || 0), 0);
        const surplusFromPrevious = Math.max(0, previousPaid - previousDue);
        
        // Cần đóng = Tổng - Dư từ trước (không được âm)
        const amountDue = Math.max(0, totalAmountDue - surplusFromPrevious);
        
        const legacyPaid = paymentRecords
          .filter((record) => record.room === room && matchesSelectedPeriod(record.month, record.year))
          .reduce((sum, record) => sum + Number(record.amountPaid || 0), 0);
        const amountPaid = savedPayment ? Number(savedPayment.amountPaid || 0) : legacyPaid;

        return {
          id: rowKey,
          key: rowKey,
          room,
          owner: household?.owner || fallbackRecord?.owner || "__",
          periods,
          amountDue,
          amountPaid,
          paidDate: savedPayment?.paidDate || "",
          note: savedPayment?.note || "",
          history: savedPayment?.history || [],
          status: calculatePaymentStatus(amountDue, amountPaid),
          items,
        };
      })
      .filter((bill) => bill.amountDue > 0)
      .filter((bill) => !filters.room.trim() || bill.room.includes(filters.room.trim()))
      .filter((bill) => filters.status === "ALL" || bill.status === filters.status)
      .filter((bill) => !showOnlyUnpaid || bill.status === "UNPAID")
      .sort((a, b) => String(a.room).localeCompare(String(b.room)));
  }, [paymentRecords, vehiclesList, utilitiesList, unitPrices, householdPaymentStatus, filters, showOnlyUnpaid]);

  const resetFilters = () => {
    setFilters({ room: "", status: "ALL", month: String(currentMonth), year: String(currentYear) });
    setShowOnlyUnpaid(false);
  };

  const handleCreateBatch = () => {
    if (batchType === "mandatory" || batchType === "all") {
      const fee = getFee(batchData.feeId);
      if (!fee) {
        setError("Vui lòng chọn khoản thu bắt buộc");
        return;
      }
      setConfirmBatchData({ type: batchType, fee, month: batchData.month, year: batchData.year });
    } else if (batchType === "utilities") {
      setConfirmBatchData({ type: "utilities", month: batchData.month, year: batchData.year });
    } else if (batchType === "vehicles") {
      setConfirmBatchData({ type: "vehicles", month: batchData.month, year: batchData.year });
    }
  };

  const handleConfirmBatch = () => {
    if (!confirmBatchData) return;

    if (confirmBatchData.type === "mandatory") {
      const newRecords = buildPaymentRecordsForFee(confirmBatchData.fee, Number(confirmBatchData.month), Number(confirmBatchData.year), paymentRecords);
      if (newRecords.length === 0) {
        setError("Đợt thu này đã được lập cho tất cả hộ đang ở");
        setConfirmBatchData(null);
        return;
      }
      setPaymentRecords((prev) => [...prev, ...newRecords]);
    } else if (confirmBatchData.type === "all") {
      const newRecords = buildPaymentRecordsForFee(confirmBatchData.fee, Number(confirmBatchData.month), Number(confirmBatchData.year), paymentRecords);
      if (newRecords.length === 0) {
        setError("Đợt thu này đã được lập cho tất cả hộ đang ở");
        setConfirmBatchData(null);
        return;
      }
      setPaymentRecords((prev) => [...prev, ...newRecords]);
    } else if (confirmBatchData.type === "utilities") {
      // Utilities data is already in the system
    } else if (confirmBatchData.type === "vehicles") {
      // Vehicles data is already in the system
    }

    setError("");
    setShowBatchForm(false);
    setConfirmBatchData(null);
  };

  const openPaymentDetail = (bill) => {
    setSelectedBill(bill);
    
    // Kiểm tra nếu có dư từ tháng trước, thì auto-fill amountPaid = amountDue
    const selectedMonth = Number(filters.month);
    const selectedYear = Number(filters.year);
    const previousRecords = paymentRecords.filter((record) => 
      record.room === bill.room && 
      (Number(record.year) < selectedYear || 
       (Number(record.year) === selectedYear && Number(record.month) < selectedMonth))
    );
    const previousDue = previousRecords.reduce((sum, record) => sum + Number(record.amountDue || 0), 0);
    const previousPaid = previousRecords.reduce((sum, record) => sum + Number(record.amountPaid || 0), 0);
    const surplusFromPrevious = Math.max(0, previousPaid - previousDue);
    
    // Nếu có dư >= 0, tự động fill "Đã nộp" = "Cần nộp"
    const autoPaid = surplusFromPrevious > 0 ? bill.amountDue : bill.amountPaid;
    
    setPaymentForm({
      amountPaid: String(autoPaid || ""),
      paidDate: bill.paidDate || new Date().toISOString().slice(0, 10),
      note: bill.note || "",
    });
    setError("");
  };

  const getPaymentChangeLog = (from, to) => {
    const changes = [];
    if (Number(from.amountPaid || 0) !== Number(to.amountPaid || 0)) changes.push(`Đã nộp: ${money(from.amountPaid || 0)} → ${money(to.amountPaid || 0)}`);
    if ((from.paidDate || "") !== (to.paidDate || "")) changes.push(`Ngày nộp: ${from.paidDate || "__"} → ${to.paidDate || "__"}`);
    if ((from.note || "") !== (to.note || "")) changes.push("Ghi chú đã được cập nhật");
    if (from.status !== to.status) changes.push(`Trạng thái: ${getPaymentStatusLabel(from.status)} → ${getPaymentStatusLabel(to.status)}`);
    return changes;
  };

  const handleSavePayment = () => {
    if (!selectedBill) return;

    const amountPaid = Number(paymentForm.amountPaid || 0);
    if (amountPaid < 0) {
      setError("Số tiền đã nộp không được nhỏ hơn 0");
      return;
    }

    const status = calculatePaymentStatus(selectedBill.amountDue, amountPaid);
    const updatedBill = {
      ...selectedBill,
      amountPaid,
      paidDate: amountPaid > 0 ? paymentForm.paidDate : "",
      note: paymentForm.note.trim(),
      status,
      history: selectedBill.history ? [...selectedBill.history] : [],
    };

    const changes = getPaymentChangeLog(selectedBill, updatedBill);
    if (changes.length) {
      updatedBill.history.unshift({
        id: `HP-${Date.now()}`,
        date: new Date().toLocaleString("vi-VN", { dateStyle: "short", timeStyle: "short" }),
        changes,
      });
    }

    setHouseholdPaymentStatus((prev) => ({
      ...prev,
      [selectedBill.key]: {
        amountPaid: updatedBill.amountPaid,
        paidDate: updatedBill.paidDate,
        note: updatedBill.note,
        history: updatedBill.history,
      },
    }));

    setSelectedBill(null);
    setPaymentForm({ amountPaid: "", paidDate: "", note: "" });
    setError("");
  };

  const handleDeletePayment = () => {
    if (!deleteConfirm) return;
    setHouseholdPaymentStatus((prev) => {
      const next = { ...prev };
      delete next[deleteConfirm.key];
      return next;
    });
    setDeleteConfirm(null);
    setSelectedBill(null);
  };

  const summary = householdRows.reduce(
    (acc, bill) => {
      acc.totalDue += Number(bill.amountDue || 0);
      acc.totalPaid += Number(bill.amountPaid || 0);
      if (bill.status === "UNPAID") acc.unpaid += 1;
      if (bill.status === "PAID") acc.paid += 1;
      return acc;
    },
    { totalDue: 0, totalPaid: 0, unpaid: 0, paid: 0 }
  );

  const getPeriodSummary = (bill) => {
    if (!bill.periods?.length) return "__";
    if (bill.periods.length === 1) return `Tháng ${bill.periods[0].month}/${bill.periods[0].year}`;
    const first = bill.periods[0];
    const last = bill.periods[bill.periods.length - 1];
    return `${bill.periods.length} kỳ (${first.month}/${first.year} - ${last.month}/${last.year})`;
  };

  return (
    <>
      <SectionHeader
        title="Lập đợt thu / Thu phí"
        desc="Bảng chính chỉ hiển thị một dòng cho mỗi căn hộ. Bấm Chi tiết để xem từng khoản như tiền phòng, phí quản lý, gửi xe, điện, nước, internet."
        action={<Button onClick={() => setShowBatchForm(true)}><Plus className="h-4 w-4" /> Lập đợt thu</Button>}
      />

      <div className="mb-5 grid gap-4 md:grid-cols-4">
        <Card><p className="text-sm font-semibold text-slate-500">Tổng phải thu</p><p className="mt-2 text-2xl font-black">{money(summary.totalDue)}</p></Card>
        <Card><p className="text-sm font-semibold text-slate-500">Đã thu</p><p className="mt-2 text-2xl font-black text-emerald-700">{money(summary.totalPaid)}</p></Card>
        <Card><p className="text-sm font-semibold text-slate-500">Hộ đã nộp</p><p className="mt-2 text-2xl font-black text-emerald-700">{summary.paid}</p></Card>
        <Card><p className="text-sm font-semibold text-slate-500">Hộ chưa nộp</p><p className="mt-2 text-2xl font-black text-rose-700">{summary.unpaid}</p></Card>
      </div>

      {showBatchForm && (
        <Card className="mb-5">
          <h3 className="mb-4 text-lg font-black">Lập đợt thu mới</h3>
          <div className="grid gap-4" style={{ gridTemplateColumns: batchType === "all" ? "1fr 1fr 1fr" : "1fr 1fr 1fr" }}>
            <Select label="Loại đợt thu" value={batchType} onChange={(e) => setBatchType(e.target.value)}>
              <option value="mandatory">Khoản bắt buộc</option>
              <option value="all">Tất cả khoản (bắt buộc + điện/nước/Internet/gửi xe)</option>
              <option value="utilities">Điện/Nước/Internet</option>
              <option value="vehicles">Gửi xe</option>
            </Select>
            {batchType !== "all" && (
              <>
                {batchType === "mandatory" && (
                  <Select label="Khoản thu bắt buộc" value={batchData.feeId} onChange={(e) => setBatchData({ ...batchData, feeId: e.target.value })}>
                    {mandatoryFees.map((fee) => <option key={fee.id} value={fee.id}>{fee.name}</option>)}
                  </Select>
                )}
              </>
            )}
            <Select label="Tháng" value={batchData.month} onChange={(e) => setBatchData({ ...batchData, month: e.target.value })}>
              {months.map((month) => <option key={month} value={month}>Tháng {month}</option>)}
            </Select>
            <Select label="Năm" value={batchData.year} onChange={(e) => setBatchData({ ...batchData, year: e.target.value })}>
              {years.map((year) => <option key={year} value={year}>{year}</option>)}
            </Select>
          </div>
          {error && <div className="mt-4 rounded-xl bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 ring-1 ring-rose-200">{error}</div>}
          <div className="mt-4 flex justify-end gap-3">
            <Button variant="secondary" onClick={() => { setShowBatchForm(false); setError(""); }}>Hủy</Button>
            <Button onClick={handleCreateBatch}>Tạo đợt thu</Button>
          </div>
        </Card>
      )}

      <Card className="mb-5">
        <div className="grid gap-4 md:grid-cols-4">
          <Input label="Căn hộ" placeholder="VD: 1201" value={filters.room} onChange={(e) => setFilters({ ...filters, room: e.target.value })} />
          <Select label="Tháng" value={filters.month} onChange={(e) => setFilters({ ...filters, month: e.target.value })}>
            {months.map((month) => <option key={month} value={month}>Tháng {month}</option>)}
          </Select>
          <Select label="Năm" value={filters.year} onChange={(e) => setFilters({ ...filters, year: e.target.value })}>
            {years.map((year) => <option key={year} value={year}>{year}</option>)}
          </Select>
          <Select label="Trạng thái" value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })}>
            <option value="ALL">Tất cả</option>
            <option value="PAID">Đã nộp</option>
            <option value="UNPAID">Chưa nộp</option>
          </Select>
        </div>
        <div className="mt-4 flex flex-wrap gap-3">
          <Button onClick={() => setShowOnlyUnpaid(false)}><Search className="h-4 w-4" /> Tìm kiếm</Button>
          <Button variant="secondary" onClick={() => setShowOnlyUnpaid(true)}>Danh sách hộ chưa nộp</Button>
          <Button variant="secondary" onClick={() => setFilters({ room: "", status: "ALL", month: String(currentMonth), year: String(currentYear) })}>Xóa bộ lọc</Button>
        </div>
      </Card>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-5 py-4">Căn hộ</th>
                <th className="px-5 py-4">Chủ hộ</th>
                <th className="px-5 py-4">Cần đóng</th>
                <th className="px-5 py-4">Đã nộp</th>
                <th className="px-5 py-4">Còn dư</th>
                <th className="px-5 py-4">Trạng thái</th>
                <th className="px-5 py-4 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {householdRows.map((bill) => {
                const surplus = Number(bill.amountPaid || 0) - Number(bill.amountDue || 0);
                return (
                  <tr key={bill.key} className="hover:bg-slate-50/80">
                    <td className="px-5 py-4 font-semibold text-slate-800">{bill.room}</td>
                    <td className="px-5 py-4 text-slate-700">{bill.owner}</td>
                    <td className="px-5 py-4 text-slate-700">{money(bill.amountDue)}</td>
                    <td className="px-5 py-4 text-slate-700">{money(bill.amountPaid || 0)}</td>
                    <td className={`px-5 py-4 font-semibold ${surplus > 0 ? 'text-emerald-700' : surplus < 0 ? 'text-rose-700' : 'text-slate-700'}`}>
                      {surplus > 0 ? `+${money(surplus)}` : surplus < 0 ? `−${money(Math.abs(surplus))}` : money(0)}
                    </td>
                    <td className="px-5 py-4"><Badge tone={getPaymentStatusTone(bill.status)}>{getPaymentStatusLabel(bill.status)}</Badge></td>
                    <td className="px-5 py-4 text-right">
                      <button onClick={() => openPaymentDetail(bill)} className="font-semibold text-sky-700 hover:text-sky-900">Chi tiết</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {selectedBill && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="max-h-[90vh] w-full max-w-5xl overflow-y-auto rounded-3xl bg-white p-6 shadow-xl">
            <h3 className="mb-4 text-lg font-black">Chi tiết thu phí căn {selectedBill.room}</h3>
            <div className="mb-4 grid gap-3 md:grid-cols-5">
              <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600"><strong>Chủ hộ:</strong><br />{selectedBill.owner}</div>
              <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600"><strong>Tháng hiện tại:</strong><br />Tháng {new Date().getMonth() + 1}/{new Date().getFullYear()}</div>
              <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600"><strong>Tổng cần đóng:</strong><br />{money(selectedBill.amountDue)}</div>
              <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600"><strong>Đã nộp:</strong><br />{money(Number(paymentForm.amountPaid || 0))}</div>
              <div className={`rounded-2xl p-4 text-sm font-semibold ${Number(paymentForm.amountPaid || 0) > selectedBill.amountDue ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-50 text-slate-600'}`}>
                <strong>Còn dư:</strong><br />
                {Number(paymentForm.amountPaid || 0) > selectedBill.amountDue 
                  ? `+${money(Number(paymentForm.amountPaid) - selectedBill.amountDue)}` 
                  : Number(paymentForm.amountPaid || 0) < selectedBill.amountDue ? `−${money(selectedBill.amountDue - Number(paymentForm.amountPaid || 0))}` : money(0)}
              </div>
            </div>

            <div className="mb-5 overflow-hidden rounded-2xl border border-slate-200">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Tháng</th>
                    <th className="px-4 py-3">Nhóm khoản</th>
                    <th className="px-4 py-3">Nội dung</th>
                    <th className="px-4 py-3">Cách tính</th>
                    <th className="px-4 py-3 text-right">Số tiền</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {selectedBill.items.map((item) => (
                    <tr key={item.id}>
                      <td className="px-4 py-3 text-slate-700">Tháng {item.period}</td>
                      <td className="px-4 py-3 text-slate-700">{item.group}</td>
                      <td className="px-4 py-3 font-semibold text-slate-800">{item.name}</td>
                      <td className="px-4 py-3 text-slate-600">{item.formula}</td>
                      <td className="px-4 py-3 text-right font-semibold text-slate-800">{money(item.amountDue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="space-y-4">
              <Select 
                label="Trạng thái thanh toán" 
                value={Number(paymentForm.amountPaid || 0) >= selectedBill.amountDue ? "PAID" : "UNPAID"}
                onChange={(e) => {
                  if (e.target.value === "PAID") {
                    setPaymentForm({ ...paymentForm, amountPaid: String(selectedBill.amountDue) });
                  } else {
                    setPaymentForm({ ...paymentForm, amountPaid: "" });
                  }
                }}
              >
                <option value="UNPAID">Chưa nộp</option>
                <option value="PAID">Đã nộp</option>
              </Select>
              <Input label="Số tiền đã nộp" type="number" value={paymentForm.amountPaid} onChange={(e) => setPaymentForm({ ...paymentForm, amountPaid: e.target.value })} />
              <Input label="Ngày nộp" type="date" value={paymentForm.paidDate} onChange={(e) => setPaymentForm({ ...paymentForm, paidDate: e.target.value })} />
              <label className="block">
                <span className="mb-1.5 block text-sm font-semibold text-slate-700">Ghi chú</span>
                <textarea rows={3} value={paymentForm.note} onChange={(e) => setPaymentForm({ ...paymentForm, note: e.target.value })} className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100" />
              </label>
              {error && <div className="rounded-xl bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 ring-1 ring-rose-200">{error}</div>}
              <div className="flex flex-wrap justify-between gap-3">
                <div className="flex flex-wrap gap-3">
                  <Button variant="secondary" onClick={() => setSelectedBill(null)}>Hủy</Button>
                  <Button variant="secondary" onClick={() => setHistoryTarget(selectedBill)}>Lịch sử chỉnh sửa</Button>
                  <Button variant="danger" onClick={() => setDeleteConfirm(selectedBill)}>Xóa ghi nhận nộp</Button>
                </div>
                <Button onClick={handleSavePayment}>Lưu</Button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {deleteConfirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
          <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-xl">
            <h3 className="mb-3 text-lg font-black">Xóa ghi nhận nộp tiền</h3>
            <p className="mb-5 text-sm text-slate-600">Bạn có chắc muốn xóa số tiền đã nộp của căn <strong>{deleteConfirm.room}</strong>? Các khoản cần đóng vẫn được giữ lại.</p>
            <div className="flex justify-end gap-3">
              <Button variant="secondary" onClick={() => setDeleteConfirm(null)}>Hủy</Button>
              <Button variant="danger" onClick={handleDeletePayment}>Xóa</Button>
            </div>
          </motion.div>
        </div>
      )}

      {confirmBatchData && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
          <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-xl">
            <h3 className="mb-3 text-lg font-black">Xác nhận lập đợt thu</h3>
            <p className="mb-5 text-sm text-slate-600">
              Bạn có chắc muốn lập đợt thu 
              <strong>
                {confirmBatchData.type === "mandatory" && ` khoản bắt buộc cho tháng ${confirmBatchData.month}/${confirmBatchData.year}`}
                {confirmBatchData.type === "all" && ` tất cả khoản (bắt buộc + điện/nước/gửi xe) cho tháng ${confirmBatchData.month}/${confirmBatchData.year}`}
                {confirmBatchData.type === "utilities" && ` điện/nước/internet cho tháng ${confirmBatchData.month}/${confirmBatchData.year}`}
                {confirmBatchData.type === "vehicles" && ` gửi xe cho tháng ${confirmBatchData.month}/${confirmBatchData.year}`}
              </strong>?
            </p>
            <div className="flex justify-end gap-3">
              <Button variant="secondary" onClick={() => setConfirmBatchData(null)}>Hủy</Button>
              <Button onClick={handleConfirmBatch}>Xác nhận</Button>
            </div>
          </motion.div>
        </div>
      )}

      {historyTarget && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4">
          <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl bg-white p-6 shadow-xl">
            <h3 className="mb-4 text-lg font-black">Lịch sử chỉnh sửa thu phí</h3>
            {historyTarget.history?.length ? (
              <div className="space-y-3">
                {historyTarget.history.map((item) => (
                  <div key={item.id} className="rounded-2xl border border-slate-200 p-4">
                    <p className="font-bold text-slate-900">{item.date}</p>
                    <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-600">
                      {item.changes.map((change, index) => <li key={index}>{change}</li>)}
                    </ul>
                  </div>
                ))}
              </div>
            ) : (
              <p className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">Chưa có lịch sử chỉnh sửa.</p>
            )}
            <div className="mt-5 flex justify-end">
              <Button variant="secondary" onClick={() => setHistoryTarget(null)}>Đóng</Button>
            </div>
          </motion.div>
        </div>
      )}
    </>
  );
}
