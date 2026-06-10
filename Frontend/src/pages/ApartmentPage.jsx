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

export function Apartments() {
  const [filteredApartments, setFilteredApartments] = useState(apartments);
  const [selectedApartment, setSelectedApartment] = useState(null);
  const [filters, setFilters] = useState({
    code: "",
    floor: "Tất cả tầng",
    status: "Tất cả",
    owner: "",
  });

  const handleSearch = () => {
    let results = apartments;

    if (filters.code.trim()) {
      results = results.filter((a) => a.code.includes(filters.code.trim()));
    }

    if (filters.floor !== "Tất cả tầng") {
      const floorNum = parseInt(filters.floor.replace("Tầng ", ""));
      results = results.filter((a) => a.floor === floorNum);
    }

    if (filters.status !== "Tất cả") {
      const statusMap = {
        "Đang ở": "OCCUPIED",
        "Đang trống": "AVAILABLE",
      };
      const statusValue = statusMap[filters.status];
      results = results.filter((a) => a.status === statusValue);
    }

    if (filters.owner.trim()) {
      results = results.filter((a) => a.owner.toLowerCase().includes(filters.owner.toLowerCase()));
    }

    setFilteredApartments(results);
  };

  const handleReset = () => {
    setFilters({
      code: "",
      floor: "Tất cả tầng",
      status: "Tất cả",
      owner: "",
    });
    setFilteredApartments(apartments);
  };

  const getApartmentMembers = (apartmentCode) => residents.filter((resident) => resident.room === apartmentCode);

  return (
    <>
      <SectionHeader title="Quản lý căn hộ" desc="Danh sách căn hộ cố định, có lọc theo số căn, tầng, trạng thái và chủ hộ." />

      <div className="mb-5 grid gap-3 md:grid-cols-4">
        <Input
          label="Số căn hộ"
          placeholder="VD: 1201"
          value={filters.code}
          onChange={(e) => setFilters({ ...filters, code: e.target.value })}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
        />
        <Select
          label="Tầng"
          value={filters.floor}
          onChange={(e) => setFilters({ ...filters, floor: e.target.value })}
        >
          <option>Tất cả tầng</option>
          <option>Tầng 12</option>
          <option>Tầng 18</option>
          <option>Tầng 24</option>
        </Select>
        <Select
          label="Trạng thái"
          value={filters.status}
          onChange={(e) => setFilters({ ...filters, status: e.target.value })}
        >
          <option>Tất cả</option>
          <option>Đang ở</option>
          <option>Đang trống</option>
        </Select>
        <Input
          label="Tên chủ hộ"
          placeholder="Nhập tên chủ hộ"
          value={filters.owner}
          onChange={(e) => setFilters({ ...filters, owner: e.target.value })}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
        />
      </div>

      <div className="mb-5 flex gap-3">
        <Button onClick={handleSearch}><Search className="h-4 w-4" /> Tìm kiếm</Button>
        <Button variant="secondary" onClick={handleReset}>Xoá bộ lọc</Button>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-5 py-4">Số căn</th>
                <th className="px-5 py-4">Tầng</th>
                <th className="px-5 py-4">Diện tích</th>
                <th className="px-5 py-4">Chủ hộ</th>
                <th className="px-5 py-4">Nhân khẩu</th>
                <th className="px-5 py-4">Trạng thái</th>
                <th className="px-5 py-4 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredApartments.map((apartment) => (
                <tr key={apartment.code} className="hover:bg-slate-50/80">
                  <td className="whitespace-nowrap px-5 py-4 font-semibold text-slate-800">{apartment.code}</td>
                  <td className="whitespace-nowrap px-5 py-4 text-slate-700">{apartment.floor}</td>
                  <td className="whitespace-nowrap px-5 py-4 text-slate-700">{apartment.area} m²</td>
                  <td className="whitespace-nowrap px-5 py-4 text-slate-700">{apartment.owner}</td>
                  <td className="whitespace-nowrap px-5 py-4 text-slate-700">{apartment.members}</td>
                  <td className="whitespace-nowrap px-5 py-4"><StatusBadge status={apartment.status} /></td>
                  <td className="px-5 py-4 text-right">
                    <button onClick={() => setSelectedApartment(apartment)} className="font-semibold text-sky-700 hover:text-sky-900">
                      Chi tiết
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {selectedApartment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 12 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl"
          >
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <h3 className="text-xl font-black text-slate-900">Chi tiết căn hộ {selectedApartment.code}</h3>
                <p className="mt-1 text-sm text-slate-500">
                  Tầng {selectedApartment.floor} • {selectedApartment.area} m² • Chủ hộ: {selectedApartment.owner}
                </p>
              </div>
              <StatusBadge status={selectedApartment.status} />
            </div>

            <div className="mb-5 grid gap-4 md:grid-cols-3">
              <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Số căn</p>
                <p className="mt-1 text-lg font-black text-slate-900">{selectedApartment.code}</p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Tầng</p>
                <p className="mt-1 text-lg font-black text-slate-900">{selectedApartment.floor}</p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Diện tích</p>
                <p className="mt-1 text-lg font-black text-slate-900">{selectedApartment.area} m²</p>
              </div>
            </div>

            <h4 className="mb-3 text-lg font-black text-slate-900">Thành viên trong căn hộ</h4>
            {getApartmentMembers(selectedApartment.code).length === 0 ? (
              <div className="rounded-2xl bg-slate-50 px-4 py-6 text-center text-sm font-semibold text-slate-500 ring-1 ring-slate-200">
                Căn hộ này chưa có thông tin thành viên.
              </div>
            ) : (
              <div className="overflow-hidden rounded-2xl border border-slate-200">
                <table className="min-w-full divide-y divide-slate-200 text-sm">
                  <thead className="bg-slate-50 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-4 py-3">Họ tên</th>
                      <th className="px-4 py-3">Năm sinh</th>
                      <th className="px-4 py-3">CCCD/CMND</th>
                      <th className="px-4 py-3">Quan hệ</th>
                      <th className="px-4 py-3">Trạng thái</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {getApartmentMembers(selectedApartment.code).map((member) => (
                      <tr key={`${member.room}-${member.name}`}>
                        <td className="px-4 py-3 font-semibold text-slate-800">{member.name}</td>
                        <td className="px-4 py-3 text-slate-700">{member.birthYear}</td>
                        <td className="px-4 py-3 text-slate-700">{member.idCard}</td>
                        <td className="px-4 py-3 text-slate-700">{member.relation}</td>
                        <td className="px-4 py-3"><StatusBadge status={member.status} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="mt-5 flex justify-end">
              <Button variant="secondary" onClick={() => setSelectedApartment(null)}>Đóng</Button>
            </div>
          </motion.div>
        </div>
      )}
    </>
  );
}
