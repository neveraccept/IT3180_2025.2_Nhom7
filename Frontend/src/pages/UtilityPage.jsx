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

export function Utilities() {
  const utilityTypes = [
    { value: "ELECTRICITY", label: "Điện" },
    { value: "WATER", label: "Nước" },
    { value: "INTERNET", label: "Internet" },
  ];

  const months = Array.from({ length: 12 }, (_, index) => index + 1);
  const years = [2024, 2025, 2026, 2027, 2028];

  const [unitPrices, setUnitPrices] = useDatabaseState("bluemoon_utility_prices", {
    ELECTRICITY: 3500,
    WATER: 7000,
    INTERNET: 220000,
  });
  const [priceForm, setPriceForm] = useState(unitPrices);
  const [showPriceForm, setShowPriceForm] = useState(false);

  const [utilitiesList, setUtilitiesList] = useDatabaseState("bluemoon_utilities", initialUtilities);
  const [filteredUtilities, setFilteredUtilities] = useState(initialUtilities);
  const [showForm, setShowForm] = useState(false);
  const [editingIndex, setEditingIndex] = useState(null);
  const [error, setError] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [changeReason, setChangeReason] = useState("");
  const [searchFilters, setSearchFilters] = useState({
    room: "",
    type: "",
    month: "",
    year: "",
    status: "",
  });
  const [formData, setFormData] = useState({
    room: "",
    type: "ELECTRICITY",
    month: 5,
    year: 2026,
    oldIndex: "",
    newIndex: "",
    status: "UNPAID",
  });

  const parseNumber = (value) => {
    if (value === "__") return 0;
    const number = Number(value);
    return Number.isNaN(number) ? 0 : number;
  };

  const getUtilityLabel = (type) => {
    const utilityType = utilityTypes.find((item) => item.value === type);
    return utilityType ? utilityType.label : type;
  };

  const getUnitLabel = (type) => {
    if (type === "ELECTRICITY") return "đ/số";
    if (type === "WATER") return "đ/m³";
    return "đ/tháng";
  };

  const calculateAmount = (utility) => {
    if (utility.type === "INTERNET") {
      return parseNumber(unitPrices.INTERNET);
    }

    const oldIndex = parseNumber(utility.oldIndex);
    const newIndex = parseNumber(utility.newIndex);
    return Math.max(0, newIndex - oldIndex) * parseNumber(unitPrices[utility.type]);
  };

  const filterUtilities = (list) => {
    let results = list;

    if (searchFilters.room.trim()) {
      results = results.filter((item) => item.room.includes(searchFilters.room.trim()));
    }

    if (searchFilters.type) {
      results = results.filter((item) => item.type === searchFilters.type);
    }

    if (searchFilters.month) {
      results = results.filter((item) => String(item.month) === String(searchFilters.month));
    }

    if (searchFilters.year) {
      results = results.filter((item) => String(item.year) === String(searchFilters.year));
    }

    if (searchFilters.status) {
      results = results.filter((item) => item.status === searchFilters.status);
    }

    return results;
  };

  const handleSearch = () => {
    setFilteredUtilities(filterUtilities(utilitiesList));
  };

  const handleResetSearch = () => {
    setSearchFilters({
      room: "",
      type: "",
      month: "",
      year: "",
      status: "",
    });
    setFilteredUtilities(utilitiesList);
  };

  const openCreateForm = () => {
    setFormData({
      room: "",
      type: "ELECTRICITY",
      month: 5,
      year: 2026,
      oldIndex: "",
      newIndex: "",
      status: "UNPAID",
    });
    setChangeReason("");
    setError("");
    setEditingIndex(null);
    setShowForm(true);
  };

  const handleEdit = (index, utility) => {
    setFormData({
      room: utility.room,
      type: utility.type,
      month: utility.month,
      year: utility.year,
      oldIndex: utility.type === "INTERNET" ? "" : String(utility.oldIndex),
      newIndex: utility.type === "INTERNET" ? "" : String(utility.newIndex),
      status: utility.status,
    });
    setChangeReason("");
    setError("");
    setEditingIndex(index);
    setShowForm(true);
  };

  const handleTypeChange = (type) => {
    setFormData((prev) => ({
      ...prev,
      type,
      oldIndex: type === "INTERNET" ? "" : prev.oldIndex,
      newIndex: type === "INTERNET" ? "" : prev.newIndex,
    }));
    setError("");
    setChangeReason("");
  };

  const validateUtilityForm = () => {
    if (!formData.room.trim()) {
      return "Vui lòng nhập căn hộ";
    }

    if (formData.type !== "INTERNET") {
      if (formData.oldIndex === "" || formData.newIndex === "") {
        return "Vui lòng nhập chỉ số cũ và chỉ số mới";
      }

      const oldIndex = parseNumber(formData.oldIndex);
      const newIndex = parseNumber(formData.newIndex);

      if (oldIndex < 0 || newIndex < 0) {
        return "Chỉ số không được âm";
      }

      if (newIndex < oldIndex) {
        return "Chỉ số mới phải lớn hơn hoặc bằng chỉ số cũ";
      }

      const oldRecord = editingIndex !== null ? utilitiesList[editingIndex] : null;
      const changedOldIndex =
        oldRecord &&
        oldRecord.type !== "INTERNET" &&
        parseNumber(oldRecord.oldIndex) !== oldIndex;

      if (changedOldIndex && !changeReason.trim()) {
        return "Bạn phải nhập lý do khi thay đổi chỉ số cũ";
      }
    }

    return "";
  };

  const handleSave = () => {
    const validationError = validateUtilityForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    const savedUtility = {
      id: editingIndex !== null ? utilitiesList[editingIndex].id : Date.now(),
      room: formData.room.trim(),
      type: formData.type,
      month: Number(formData.month),
      year: Number(formData.year),
      oldIndex: formData.type === "INTERNET" ? "__" : parseNumber(formData.oldIndex),
      newIndex: formData.type === "INTERNET" ? "__" : parseNumber(formData.newIndex),
      status: formData.status,
      changeReason: changeReason.trim(),
    };

    let updatedList;
    if (editingIndex !== null) {
      updatedList = [...utilitiesList];
      updatedList[editingIndex] = savedUtility;
    } else {
      updatedList = [...utilitiesList, savedUtility];
    }

    setUtilitiesList(updatedList);
    setFilteredUtilities(filterUtilities(updatedList));
    setShowForm(false);
    setEditingIndex(null);
    setChangeReason("");
    setError("");
  };

  const handleDeleteClick = () => {
    if (editingIndex !== null) {
      const utility = utilitiesList[editingIndex];
      setDeleteConfirm({
        index: editingIndex,
        room: utility.room,
        type: getUtilityLabel(utility.type),
        month: utility.month,
        year: utility.year,
      });
    }
  };

  const handleConfirmDelete = () => {
    if (!deleteConfirm) return;

    const updatedList = utilitiesList.filter((_, index) => index !== deleteConfirm.index);
    setUtilitiesList(updatedList);
    setFilteredUtilities(filterUtilities(updatedList));
    setDeleteConfirm(null);
    setShowForm(false);
    setEditingIndex(null);
    setError("");
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingIndex(null);
    setChangeReason("");
    setError("");
  };

  const handleOpenPriceForm = () => {
    setPriceForm(unitPrices);
    setShowPriceForm(true);
  };

  const handleSavePrice = () => {
    if (
      parseNumber(priceForm.ELECTRICITY) <= 0 ||
      parseNumber(priceForm.WATER) <= 0 ||
      parseNumber(priceForm.INTERNET) <= 0
    ) {
      alert("Đơn giá phải lớn hơn 0");
      return;
    }

    setUnitPrices({
      ELECTRICITY: parseNumber(priceForm.ELECTRICITY),
      WATER: parseNumber(priceForm.WATER),
      INTERNET: parseNumber(priceForm.INTERNET),
    });
    setShowPriceForm(false);
  };

  const shouldShowChangeReason = (() => {
    if (editingIndex === null || formData.type === "INTERNET") return false;
    const oldRecord = utilitiesList[editingIndex];
    if (!oldRecord || oldRecord.type === "INTERNET") return false;
    return parseNumber(oldRecord.oldIndex) !== parseNumber(formData.oldIndex);
  })();

  return (
    <>
      <SectionHeader
        title="Quản lý phí điện, nước, internet"
        desc="Nhập hoá đơn theo từng hộ và từng tháng, ghi nhận đã nộp, tra cứu theo hộ."
        action={
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={handleOpenPriceForm}>
              Thay đổi đơn giá
            </Button>
            <Button onClick={openCreateForm}>
              <Plus className="h-4 w-4" /> Nhập hóa đơn
            </Button>
          </div>
        }
      />

      <Card className="mb-5">
        <div className="grid gap-4 md:grid-cols-5">
          <Input
            label="Tìm theo căn hộ"
            placeholder="VD: 1201"
            value={searchFilters.room}
            onChange={(e) => setSearchFilters({ ...searchFilters, room: e.target.value })}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          />
          <Select
            label="Loại hóa đơn"
            value={searchFilters.type}
            onChange={(e) => setSearchFilters({ ...searchFilters, type: e.target.value })}
          >
            <option value="">Tất cả</option>
            <option value="ELECTRICITY">Điện</option>
            <option value="WATER">Nước</option>
            <option value="INTERNET">Internet</option>
          </Select>
          <Select
            label="Tháng"
            value={searchFilters.month}
            onChange={(e) => setSearchFilters({ ...searchFilters, month: e.target.value })}
          >
            <option value="">Tất cả</option>
            {months.map((month) => (
              <option key={month} value={month}>Tháng {month}</option>
            ))}
          </Select>
          <Select
            label="Năm"
            value={searchFilters.year}
            onChange={(e) => setSearchFilters({ ...searchFilters, year: e.target.value })}
          >
            <option value="">Tất cả</option>
            {years.map((year) => (
              <option key={year} value={year}>{year}</option>
            ))}
          </Select>
          <Select
            label="Trạng thái"
            value={searchFilters.status}
            onChange={(e) => setSearchFilters({ ...searchFilters, status: e.target.value })}
          >
            <option value="">Tất cả</option>
            <option value="PAID">Đã nộp</option>
            <option value="UNPAID">Chưa nộp</option>
          </Select>
        </div>
        <div className="mt-4 flex gap-3">
          <Button onClick={handleSearch}>
            <Search className="h-4 w-4" /> Tìm kiếm
          </Button>
          <Button variant="secondary" onClick={handleResetSearch}>
            Xoá bộ lọc
          </Button>
        </div>
      </Card>

      {showPriceForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="w-full max-w-md rounded-3xl bg-white p-6 shadow-xl">
            <h3 className="mb-4 text-lg font-bold">Thay đổi đơn giá</h3>
            <div className="space-y-4">
              <Input
                label="Đơn giá điện (đ/số)"
                type="number"
                min="1"
                value={priceForm.ELECTRICITY}
                onChange={(e) => setPriceForm({ ...priceForm, ELECTRICITY: e.target.value })}
              />
              <Input
                label="Đơn giá nước (đ/m³)"
                type="number"
                min="1"
                value={priceForm.WATER}
                onChange={(e) => setPriceForm({ ...priceForm, WATER: e.target.value })}
              />
              <Input
                label="Đơn giá Internet (đ/tháng)"
                type="number"
                min="1"
                value={priceForm.INTERNET}
                onChange={(e) => setPriceForm({ ...priceForm, INTERNET: e.target.value })}
              />
              <div className="flex justify-end gap-3 pt-2">
                <Button variant="secondary" onClick={() => setShowPriceForm(false)}>Hủy</Button>
                <Button onClick={handleSavePrice}>Lưu đơn giá</Button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <h3 className="mb-4 text-lg font-bold">
              {editingIndex !== null ? "Chi tiết hóa đơn" : "Nhập hóa đơn mới"}
            </h3>

            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <Input
                  label="Căn hộ"
                  placeholder="VD: 1201"
                  value={formData.room}
                  onChange={(e) => setFormData({ ...formData, room: e.target.value })}
                />
                <Select
                  label="Loại hóa đơn"
                  value={formData.type}
                  onChange={(e) => handleTypeChange(e.target.value)}
                >
                  <option value="ELECTRICITY">Điện</option>
                  <option value="WATER">Nước</option>
                  <option value="INTERNET">Internet</option>
                </Select>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <Select
                  label="Tháng"
                  value={formData.month}
                  onChange={(e) => setFormData({ ...formData, month: Number(e.target.value) })}
                >
                  {months.map((month) => (
                    <option key={month} value={month}>Tháng {month}</option>
                  ))}
                </Select>
                <Select
                  label="Năm"
                  value={formData.year}
                  onChange={(e) => setFormData({ ...formData, year: Number(e.target.value) })}
                >
                  {years.map((year) => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </Select>
                <Select
                  label="Trạng thái"
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                >
                  <option value="UNPAID">Chưa nộp</option>
                  <option value="PAID">Đã nộp</option>
                </Select>
              </div>

              {formData.type === "INTERNET" ? (
                <div className="grid gap-4 md:grid-cols-2">
                  <Input label="Chỉ số cũ" value="__" disabled />
                  <Input label="Chỉ số mới" value="__" disabled />
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  <Input
                    label={formData.type === "ELECTRICITY" ? "Chỉ số cũ" : "Chỉ số cũ"}
                    type="number"
                    min="0"
                    value={formData.oldIndex}
                    onChange={(e) => setFormData({ ...formData, oldIndex: e.target.value })}
                  />
                  <Input
                    label={formData.type === "ELECTRICITY" ? "Chỉ số mới" : "Chỉ số mới"}
                    type="number"
                    min="0"
                    value={formData.newIndex}
                    onChange={(e) => setFormData({ ...formData, newIndex: e.target.value })}
                  />
                </div>
              )}

              {shouldShowChangeReason && (
                <label className="block">
                  <span className="mb-1.5 block text-sm font-semibold text-slate-700">
                    Lý do thay đổi chỉ số cũ
                  </span>
                  <textarea
                    rows={3}
                    value={changeReason}
                    onChange={(e) => setChangeReason(e.target.value)}
                    placeholder="Nhập lý do thay đổi chỉ số cũ..."
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
                  />
                </label>
              )}

              <div className="rounded-2xl bg-slate-50 p-4 text-sm">
                <div className="flex justify-between">
                  <span className="font-semibold text-slate-600">Đơn giá:</span>
                  <span className="font-bold text-slate-900">
                    {money(unitPrices[formData.type])} / {getUnitLabel(formData.type).replace("đ/", "")}
                  </span>
                </div>
                <div className="mt-2 flex justify-between">
                  <span className="font-semibold text-slate-600">Số tiền tạm tính:</span>
                  <span className="font-black text-sky-700">
                    {money(calculateAmount({
                      type: formData.type,
                      oldIndex: formData.type === "INTERNET" ? "__" : formData.oldIndex,
                      newIndex: formData.type === "INTERNET" ? "__" : formData.newIndex,
                    }))}
                  </span>
                </div>
              </div>

              {error && (
                <div className="rounded-xl bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 ring-1 ring-rose-200">
                  {error}
                </div>
              )}

              <div className="flex justify-between gap-3 pt-2">
                <div>
                  {editingIndex !== null && (
                    <Button variant="danger" onClick={handleDeleteClick}>
                      Xóa
                    </Button>
                  )}
                </div>
                <div className="flex gap-3">
                  <Button variant="secondary" onClick={handleCancel}>Hủy</Button>
                  <Button onClick={handleSave}>Lưu</Button>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center gap-3">
              <div className="rounded-full bg-rose-100 p-3">
                <AlertCircle className="h-6 w-6 text-rose-600" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">Xóa hóa đơn</h3>
            </div>
            <p className="mb-6 text-slate-600">
              Bạn có chắc muốn xóa hóa đơn <strong>{deleteConfirm.type}</strong> căn <strong>{deleteConfirm.room}</strong> tháng <strong>{deleteConfirm.month}/{deleteConfirm.year}</strong>?
            </p>
            <div className="flex justify-end gap-3">
              <Button variant="secondary" onClick={() => setDeleteConfirm(null)}>Hủy</Button>
              <Button variant="danger" onClick={handleConfirmDelete}>Xóa</Button>
            </div>
          </motion.div>
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-5 py-4">Căn hộ</th>
                <th className="px-5 py-4">Loại hóa đơn</th>
                <th className="px-5 py-4">Tháng/Năm</th>
                <th className="px-5 py-4">Chỉ số cũ</th>
                <th className="px-5 py-4">Chỉ số mới</th>
                <th className="px-5 py-4">Đơn giá</th>
                <th className="px-5 py-4">Số tiền</th>
                <th className="px-5 py-4">Trạng thái</th>
                <th className="px-5 py-4 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredUtilities.map((utility) => {
                const originalIdx = utilitiesList.findIndex((item) => item.id === utility.id);
                return (
                  <tr key={utility.id} className="hover:bg-slate-50/80">
                    <td className="whitespace-nowrap px-5 py-4 text-slate-700">{utility.room}</td>
                    <td className="whitespace-nowrap px-5 py-4 text-slate-700">{getUtilityLabel(utility.type)}</td>
                    <td className="whitespace-nowrap px-5 py-4 text-slate-700">{utility.month}/{utility.year}</td>
                    <td className="whitespace-nowrap px-5 py-4 text-slate-700">{utility.type === "INTERNET" ? "__" : utility.oldIndex}</td>
                    <td className="whitespace-nowrap px-5 py-4 text-slate-700">{utility.type === "INTERNET" ? "__" : utility.newIndex}</td>
                    <td className="whitespace-nowrap px-5 py-4 text-slate-700">
                      {money(unitPrices[utility.type])} / {getUnitLabel(utility.type).replace("đ/", "")}
                    </td>
                    <td className="whitespace-nowrap px-5 py-4 font-bold text-slate-900">
                      {money(calculateAmount(utility))}
                    </td>
                    <td className="whitespace-nowrap px-5 py-4 text-slate-700">
                      <StatusBadge status={utility.status} />
                    </td>
                    <td className="px-5 py-4 text-right">
                      <button onClick={() => handleEdit(originalIdx, utility)} className="font-semibold text-sky-700 hover:text-sky-900">
                        Chi tiết
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
