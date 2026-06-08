import { useState, useEffect, useCallback, useMemo } from "react";
import { motion } from "framer-motion";
import { Search, Plus, AlertCircle, Receipt } from "lucide-react";
import { money } from "../utils/helpers";
import { Badge, Button, Card, Input, Select, Pagination } from "../components/common";
import { SectionHeader } from "../components/layout/SectionHeader";
import {
  registerVehicleAPI,
  updateVehicleAPI,
  cancelVehicleAPI,
  listVehiclesByHouseholdAPI,
  listMyVehiclesAPI,
  listParkingSlotsAPI,
  getParkingSummaryAPI,
  createParkingRegistrationAPI,
  endParkingRegistrationAPI,
  listMyParkingRegistrationsAPI,
  generateParkingFeesAPI,
} from "../api/vehicleApi";
import { listSystemConfigsAPI, updateSystemConfigAPI, CONFIG_KEYS } from "../api/systemConfigApi";
import { getApartmentDetailAPI, listApartmentsAPI } from "../api/apartmentApi";

// ============================================================
//  Module 6 — Phương tiện (Vehicle) + chỗ gửi xe (Parking).
//  Nguồn dữ liệu: backend VehicleController + ParkingController.
//  - ADMIN: tổng quan chỗ gửi, đăng ký/sửa/huỷ xe theo hộ, xem chỗ gửi, tạo lượt gửi.
//  - RESIDENT: chỉ xem xe & lượt gửi của hộ mình (backend không có cư dân tự đăng ký).
//  Backend chỉ có loại xe MOTORBIKE | CAR. Giữ ngôn ngữ UI/Tailwind sẵn có.
//  Khoảng trống backend: không có API "liệt kê tất cả xe / tất cả lượt đăng ký" cho admin
//    → admin tra cứu xe theo từng hộ (householdId).
// ============================================================
const typeLabel = (t) => (t === "CAR" ? "Ô tô" : t === "MOTORBIKE" ? "Xe máy" : t);
const slotStatusBadge = (status) => {
  const map = { EMPTY: ["Trống", "green"], USED: ["Đang dùng", "blue"], RENTED: ["Cho thuê", "violet"] };
  const [label, tone] = map[status] || [status, "gray"];
  return <Badge tone={tone}>{label}</Badge>;
};
const regStatusBadge = (status) => (
  <Badge tone={status === "ACTIVE" ? "green" : "gray"}>{status === "ACTIVE" ? "Đang hiệu lực" : "Đã kết thúc"}</Badge>
);

export function Vehicles({ role = "ADMIN" }) {
  const isAdmin = role === "ADMIN";
  return isAdmin ? <AdminVehicles /> : <ResidentVehicles />;
}

// ----------------------------- ADMIN -----------------------------
function AdminVehicles() {
  const [summary, setSummary] = useState(null);
  const [slots, setSlots] = useState([]);
  const [lookupSlots, setLookupSlots] = useState(null);
  const [searchHouseholdId, setSearchHouseholdId] = useState("");
  const [searchSlotCode, setSearchSlotCode] = useState("");
  const [searchLicensePlate, setSearchLicensePlate] = useState("");
  const [loadedHousehold, setLoadedHousehold] = useState("");
  const [slotLookupTitle, setSlotLookupTitle] = useState("");
  const [pageError, setPageError] = useState("");
  const [toast, setToast] = useState(null);

  const [showForm, setShowForm] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState(null);
  const [form, setForm] = useState({
    apartmentId: "",
    householdId: "",
    licensePlate: "",
    type: "MOTORBIKE",
    active: true,
    parkingSlotId: "",
    startDate: new Date().toISOString().slice(0, 10),
    endDate: "",
  });
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const [cancelConfirm, setCancelConfirm] = useState(null);
  const [fixedParkingSlot, setFixedParkingSlot] = useState(null);
  const [removeSlotConfirm, setRemoveSlotConfirm] = useState(null);

  const [apartmentOptions, setApartmentOptions] = useState([]);
  const [loadingApartments, setLoadingApartments] = useState(false);
  const [configs, setConfigs] = useState([]);
  const [configDraft, setConfigDraft] = useState({});
  const [configSaving, setConfigSaving] = useState("");

  // Bộ lọc chỗ gửi: ALL | OCCUPIED (đang có xe) | EMPTY (đang trống)
  const [slotFilter, setSlotFilter] = useState("ALL");

  // Sinh hoá đơn phí gửi xe theo tháng.
  const [showFeeForm, setShowFeeForm] = useState(false);
  const [feeForm, setFeeForm] = useState({ month: new Date().getMonth() + 1, year: new Date().getFullYear() });
  const [feeError, setFeeError] = useState("");
  const [feeSaving, setFeeSaving] = useState(false);

  // Phân trang chỗ gửi xe: 20 chỗ/trang.
  const [slotPage, setSlotPage] = useState(1);
  const SLOT_PAGE_SIZE = 20;

  // Lọc + sắp xếp: ưu tiên chỗ đang có xe (USED/RENTED) lên trước chỗ trống (EMPTY).
  const displayedSlots = useMemo(() => {
    const sourceSlots = lookupSlots || slots;
    const isOccupied = (s) => s.status !== "EMPTY";
    const filtered = sourceSlots.filter((s) => {
      if (slotFilter === "OCCUPIED") return isOccupied(s);
      if (slotFilter === "EMPTY") return !isOccupied(s);
      return true;
    });
    return [...filtered].sort((a, b) => {
      if (slotFilter === "ALL") {
        return String(a.code).localeCompare(String(b.code), "vi", { numeric: true });
      }
      // Chỗ có xe trước (occupied = 0), chỗ trống sau (1)
      const rank = Number(!isOccupied(a)) - Number(!isOccupied(b));
      if (rank !== 0) return rank;
      return String(a.code).localeCompare(String(b.code), "vi", { numeric: true });
    });
  }, [lookupSlots, slots, slotFilter]);

  const filterSourceSlots = lookupSlots || slots;
  const filterOccupiedCount = filterSourceSlots.filter((s) => s.status !== "EMPTY").length;
  const filterEmptyCount = filterSourceSlots.length - filterOccupiedCount;

  // Cắt trang cho danh sách chỗ gửi đã lọc/sắp xếp.
  const pagedSlots = displayedSlots.slice((slotPage - 1) * SLOT_PAGE_SIZE, slotPage * SLOT_PAGE_SIZE);

  const emptySlotsForVehicleType = useMemo(
    () => slots.filter((slot) => slot.status === "EMPTY" && slot.type === form.type),
    [slots, form.type]
  );

  // Đổi bộ lọc -> quay về trang 1 để không rơi vào trang rỗng.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSlotPage(1);
  }, [lookupSlots, slotFilter]);

  const showToast = (message, tone = "green") => {
    setToast({ message, tone });
    setTimeout(() => setToast(null), 3000);
  };

  const parkingConfigKeys = [
    CONFIG_KEYS.MOTORBIKE_PARKING_PRICE,
    CONFIG_KEYS.CAR_PARKING_PRICE,
  ];
  const parkingConfigLabel = (key) =>
    ({
      [CONFIG_KEYS.MOTORBIKE_PARKING_PRICE]: "Đơn giá xe máy (đ/tháng)",
      [CONFIG_KEYS.CAR_PARKING_PRICE]: "Đơn giá ô tô (đ/tháng)",
    }[key] || key);

  const loadSummary = useCallback(async () => {
    const res = await getParkingSummaryAPI();
    if (res.success) setSummary(res.data);
  }, []);
  const loadSlots = useCallback(async () => {
    const res = await listParkingSlotsAPI();
    const items = res.success ? (res.data?.items || []) : [];
    if (res.success) setSlots(items);
    return items;
  }, []);
  const loadConfigs = useCallback(async () => {
    const res = await listSystemConfigsAPI();
    if (res.success) {
      const list = res.data || [];
      setConfigs(list);
      setConfigDraft(Object.fromEntries(list.map((c) => [c.configKey, String(c.configValue ?? "")])));
    }
  }, []);
  const loadApartmentOptions = useCallback(async () => {
    setLoadingApartments(true);
    const res = await listApartmentsAPI({ page: 0, size: 1000, sort: "code,asc" });
    setLoadingApartments(false);
    if (res.success) {
      setApartmentOptions((res.data?.items || []).filter((apartment) => apartment.currentHouseholdCode));
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadSummary();
    loadSlots();
    loadConfigs();
    loadApartmentOptions();
  }, [loadSummary, loadSlots, loadConfigs, loadApartmentOptions]);

  const handleSaveConfig = async (key) => {
    const value = Number(configDraft[key]);
    if (!(value >= 0)) {
      showToast("Đơn giá không hợp lệ", "red");
      return;
    }
    setConfigSaving(key);
    const res = await updateSystemConfigAPI(key, value);
    setConfigSaving("");
    if (!res.success) {
      showToast(res.message || "Cập nhật đơn giá thất bại", "red");
      return;
    }
    showToast("Đã cập nhật đơn giá gửi xe");
    await loadConfigs();
  };

  const findSlotByPlate = (plate) => {
    const normalizedPlate = String(plate || "").trim().toLowerCase();
    if (!normalizedPlate) return null;
    return slots.find((slot) => String(slot.licensePlate || "").trim().toLowerCase() === normalizedPlate) || null;
  };

  const loadVehicles = async (hid) => {
    const id = (hid ?? searchHouseholdId).toString().trim();
    if (!id) {
      setPageError("Nhập mã hộ (householdId) để tra cứu xe");
      return;
    }
    setPageError("");
    const res = await listVehiclesByHouseholdAPI(id);
    if (res.success) {
      const matchedSlots = (res.data?.items || [])
        .map((vehicle) => findSlotByPlate(vehicle.licensePlate))
        .filter(Boolean);
      setLookupSlots(matchedSlots);
      setLoadedHousehold(id);
      setSlotLookupTitle(`Kết quả tra cứu theo hộ #${id}`);
      setSlotFilter("ALL");
    } else {
      setPageError(res.message || "Không tải được danh sách xe của hộ");
    }
  };

  const loadVehiclesBySlot = () => {
    const keyword = searchSlotCode.trim().toLowerCase();
    if (!keyword) {
      setPageError("Nhập mã chỗ để tra cứu xe");
      return;
    }
    setPageError("");
    const matchedSlots = slots.filter((slot) => String(slot.code || "").toLowerCase().includes(keyword));
    setLookupSlots(matchedSlots);
    setLoadedHousehold("");
    setSlotLookupTitle(`Kết quả tra cứu theo mã chỗ "${searchSlotCode.trim()}"`);
    setSlotFilter("ALL");
  };

  const loadVehiclesByLicensePlate = () => {
    const keyword = searchLicensePlate.trim().toLowerCase();
    if (!keyword) {
      setPageError("Nhập biển số xe để tra cứu");
      return;
    }
    setPageError("");
    const matchedSlots = slots.filter((slot) => String(slot.licensePlate || "").toLowerCase().includes(keyword));
    setLookupSlots(matchedSlots);
    setLoadedHousehold("");
    setSlotLookupTitle(`Kết quả tra cứu theo biển số "${searchLicensePlate.trim()}"`);
    setSlotFilter("ALL");
  };

  const clearSlotLookup = () => {
    setLookupSlots(null);
    setSlotLookupTitle("");
    setSlotFilter("ALL");
  };

  const refreshLookupSlots = (freshSlots) => {
    if (!lookupSlots || freshSlots.length === 0) return;
    const freshById = new Map(freshSlots.map((slot) => [slot.id, slot]));
    setLookupSlots((current) => current?.map((slot) => freshById.get(slot.id) || slot) || null);
  };

  const openCreateForm = () => {
    setForm({
      apartmentId: "",
      householdId: "",
      licensePlate: "",
      type: "MOTORBIKE",
      active: true,
      parkingSlotId: "",
      startDate: new Date().toISOString().slice(0, 10),
      endDate: "",
    });
    setEditingVehicle(null);
    setFixedParkingSlot(null);
    setFormError("");
    setShowForm(true);
  };
  const openParkingForm = (slot) => {
    setForm({
      apartmentId: "",
      householdId: "",
      licensePlate: "",
      type: slot.type,
      active: true,
      parkingSlotId: String(slot.id),
      startDate: new Date().toISOString().slice(0, 10),
      endDate: "",
    });
    setEditingVehicle(null);
    setFixedParkingSlot(slot);
    setFormError("");
    setShowForm(true);
  };

  const handleApartmentChange = async (apartmentId) => {
    setForm((prev) => ({ ...prev, apartmentId, householdId: "" }));
    setFormError("");
    if (!apartmentId) return;

    const res = await getApartmentDetailAPI(apartmentId);
    const householdId = res.data?.currentHousehold?.id;
    if (!res.success || !householdId) {
      setFormError(res.message || "Căn hộ này chưa có hộ dân đang ở");
      return;
    }
    setForm((prev) => ({ ...prev, apartmentId, householdId: String(householdId) }));
  };

  const handleSaveVehicle = async () => {
    const plate = form.licensePlate.trim();
    if (!plate) {
      setFormError("Vui lòng nhập biển số");
      return;
    }
    setSaving(true);
    setFormError("");
    let res;
    if (editingVehicle) {
      res = await updateVehicleAPI(editingVehicle.id, { licensePlate: plate, type: form.type, active: form.active });
    } else {
      if (!String(form.householdId).trim()) {
        setSaving(false);
        setFormError("Vui lòng chọn căn hộ sở hữu");
        return;
      }
      res = await registerVehicleAPI({ householdId: Number(form.householdId), licensePlate: plate, type: form.type });
    }
    if (!res.success) {
      setSaving(false);
      setFormError(res.message || "Lưu xe thất bại");
      return;
    }
    if (!editingVehicle && form.parkingSlotId) {
      const payload = {
        slotId: Number(form.parkingSlotId),
        vehicleId: Number(res.data.id),
      };
      if (form.startDate) payload.startDate = form.startDate;
      if (form.endDate) payload.endDate = form.endDate;

      const parkingRes = await createParkingRegistrationAPI(payload);
      if (!parkingRes.success) {
        setSaving(false);
        setFormError(`Đã đăng ký xe nhưng gán chỗ gửi thất bại: ${parkingRes.message || "Vui lòng thử lại ở form gán chỗ"}`);
        await loadVehicles(String(form.householdId));
        refreshLookupSlots(await loadSlots());
        await loadSummary();
        return;
      }
    }
    setSaving(false);
    setShowForm(false);
    showToast(editingVehicle ? "Đã cập nhật xe" : form.parkingSlotId ? "Đã đăng ký xe và gán chỗ gửi" : "Đã đăng ký xe");
    const hid = editingVehicle ? loadedHousehold : String(form.householdId);
    if (hid) await loadVehicles(hid);
    refreshLookupSlots(await loadSlots());
    loadSummary();
  };

  const handleCancelVehicle = async () => {
    if (!cancelConfirm) return;
    const res = await cancelVehicleAPI(cancelConfirm.id);
    setCancelConfirm(null);
    if (!res.success) {
      showToast(res.message || "Huỷ xe thất bại", "red");
      return;
    }
    setShowForm(false);
    showToast("Đã huỷ đăng ký xe");
    if (loadedHousehold) await loadVehicles(loadedHousehold);
    loadSummary();
    refreshLookupSlots(await loadSlots());
  };

  const handleRemoveParkingRegistration = async () => {
    if (!removeSlotConfirm?.activeRegistrationId) return;
    const res = await endParkingRegistrationAPI(removeSlotConfirm.activeRegistrationId);
    setRemoveSlotConfirm(null);
    if (!res.success) {
      showToast(res.message || "Gỡ xe khỏi chỗ gửi thất bại", "red");
      return;
    }
    showToast("Đã gỡ xe khỏi chỗ gửi");
    refreshLookupSlots(await loadSlots());
    loadSummary();
  };

  const handleGenerateFees = async () => {
    setFeeError("");
    setFeeSaving(true);
    const res = await generateParkingFeesAPI({ month: feeForm.month, year: feeForm.year });
    setFeeSaving(false);
    if (!res.success) {
      setFeeError(res.message || "Tạo hoá đơn phí gửi xe thất bại");
      return;
    }
    setShowFeeForm(false);
    showToast(`Đã tạo ${res.data?.invoiceCount ?? 0} hoá đơn phí gửi xe (xem ở mục Thu phí)`);
  };

  return (
    <>
      <SectionHeader
        title="Quản lý gửi xe"
        desc="Đăng ký xe cho hộ, quản lý chỗ gửi và các lượt gửi/cho thuê. Tra cứu xe theo từng hộ."
        action={
          <div className="flex flex-wrap gap-3">
            <Button variant="secondary" onClick={() => { setFeeError(""); setShowFeeForm(true); }}>
              <Receipt className="h-4 w-4" /> Tạo hóa đơn phí gửi xe
            </Button>
            <Button onClick={openCreateForm}><Plus className="h-4 w-4" /> Đăng ký xe</Button>
          </div>
        }
      />

      {toast && (
        <div className={`mb-5 rounded-2xl px-4 py-3 text-sm font-semibold ring-1 ${toast.tone === "red" ? "bg-rose-50 text-rose-700 ring-rose-200" : "bg-emerald-50 text-emerald-700 ring-emerald-200"}`}>{toast.message}</div>
      )}

      <div className="mb-5 grid gap-4 md:grid-cols-3">
        <Card><p className="text-sm font-semibold text-slate-500">Tổng số chỗ</p><p className="mt-2 text-3xl font-black text-slate-950">{summary?.total ?? "—"}</p></Card>
        <Card><p className="text-sm font-semibold text-slate-500">Chỗ còn trống</p><p className="mt-2 text-3xl font-black text-emerald-600">{summary?.empty ?? "—"}</p></Card>
        <Card><p className="text-sm font-semibold text-slate-500">Đang gán xe hộ</p><p className="mt-2 text-3xl font-black text-sky-600">{summary?.used ?? "—"}</p></Card>
      </div>

      <Card className="mb-5">
        <div className="mb-3">
          <h3 className="text-base font-black text-slate-900">Đơn giá hệ thống</h3>
          <p className="text-sm text-slate-500">Đơn giá mặc định dùng khi gán xe hộ vào chỗ gửi.</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {configs.filter((c) => parkingConfigKeys.includes(c.configKey)).map((c) => (
            <div key={c.configKey} className="rounded-2xl border border-slate-200 p-4">
              <label className="mb-1.5 block text-sm font-semibold text-slate-700">{parkingConfigLabel(c.configKey)}</label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  min="0"
                  value={configDraft[c.configKey] ?? ""}
                  onChange={(e) => setConfigDraft({ ...configDraft, [c.configKey]: e.target.value })}
                />
                <Button onClick={() => handleSaveConfig(c.configKey)} disabled={configSaving === c.configKey}>
                  {configSaving === c.configKey ? "..." : "Lưu"}
                </Button>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {pageError && (
        <div className="mb-5 rounded-xl bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 ring-1 ring-rose-200">{pageError}</div>
      )}

      {/* Tra cứu xe */}
      <Card className="mb-5">
        <h3 className="mb-3 font-black text-slate-900">Tra cứu xe</h3>
        <div className="grid gap-3 lg:grid-cols-3">
          <div className="grid gap-3 md:grid-cols-[1fr_auto]">
            <Input
              label="Mã hộ (householdId)"
              placeholder="VD: 1"
              value={searchHouseholdId}
              onChange={(e) => setSearchHouseholdId(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && loadVehicles()}
            />
            <div className="flex items-end">
              <Button onClick={() => loadVehicles()}><Search className="h-4 w-4" /> Tra cứu</Button>
            </div>
          </div>
          <div className="grid gap-3 md:grid-cols-[1fr_auto]">
            <Input
              label="Mã chỗ"
              placeholder="VD: B1-001"
              value={searchSlotCode}
              onChange={(e) => setSearchSlotCode(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && loadVehiclesBySlot()}
            />
            <div className="flex items-end">
              <Button onClick={loadVehiclesBySlot}><Search className="h-4 w-4" /> Tra cứu</Button>
            </div>
          </div>
          <div className="grid gap-3 md:grid-cols-[1fr_auto]">
            <Input
              label="Biển số xe"
              placeholder="VD: 30A-12345"
              value={searchLicensePlate}
              onChange={(e) => setSearchLicensePlate(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && loadVehiclesByLicensePlate()}
            />
            <div className="flex items-end">
              <Button onClick={loadVehiclesByLicensePlate}><Search className="h-4 w-4" /> Tra cứu</Button>
            </div>
          </div>
        </div>
      </Card>

      {/* Chỗ gửi xe */}
      <SectionHeader title="Chỗ gửi xe" desc="Danh sách chỗ gửi và trạng thái. Bấm để tạo lượt gửi (gán xe của hộ)." />

      {slotLookupTitle && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-sky-50 px-4 py-3 text-sm font-semibold text-sky-800 ring-1 ring-sky-200">
          <span>{slotLookupTitle}</span>
          <Button variant="secondary" onClick={clearSlotLookup}>Xóa tra cứu</Button>
        </div>
      )}

      {/* Bộ lọc trạng thái chỗ gửi */}
      <div className="mb-4 flex flex-wrap items-end gap-3">
        <div className="flex flex-wrap gap-2">
          {[
            { key: "ALL", label: `Tat ca (${filterSourceSlots.length})` },
            { key: "OCCUPIED", label: `Đang có xe (${filterOccupiedCount})` },
            { key: "EMPTY", label: `Đang trống (${filterEmptyCount})` },
          ].map((f) => (
            <button
              key={f.key}
              onClick={() => setSlotFilter(f.key)}
              className={`rounded-full px-4 py-2 text-sm font-semibold ring-1 transition ${
                slotFilter === f.key
                  ? "bg-sky-600 text-white ring-sky-600"
                  : "bg-white text-slate-600 ring-slate-200 hover:bg-slate-50"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <Card className="!p-0">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-5 py-4">Mã chỗ</th>
                <th className="px-5 py-4">Loại</th>
                <th className="px-5 py-4">Biển số xe</th>
                <th className="px-5 py-4">Căn hộ sở hữu</th>
                <th className="px-5 py-4">Trạng thái</th>
                <th className="px-5 py-4 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {displayedSlots.length === 0 && (
                <tr><td colSpan={6} className="px-5 py-8 text-center text-sm font-semibold text-slate-500">
                  {slots.length === 0 ? "Chua co cho gui nao." : "Chua co cho gui nao phu hop."}
                </td></tr>
              )}
              {pagedSlots.map((s) => (
                <tr key={s.id} className="hover:bg-slate-50/80">
                  <td className="whitespace-nowrap px-5 py-4 font-semibold text-slate-800">{s.code}</td>
                  <td className="whitespace-nowrap px-5 py-4 text-slate-700">{typeLabel(s.type)}</td>
                  <td className="whitespace-nowrap px-5 py-4 text-slate-700">{s.licensePlate ?? "—"}</td>
                  <td className="whitespace-nowrap px-5 py-4 text-slate-700">{s.householdCode ?? "—"}</td>
                  <td className="whitespace-nowrap px-5 py-4">{slotStatusBadge(s.status)}</td>
                  <td className="whitespace-nowrap px-5 py-4 text-right">
                    {s.status === "EMPTY" ? (
                      <Button variant="soft" onClick={() => openParkingForm(s)}>Gán xe</Button>
                    ) : s.activeRegistrationId ? (
                      <Button variant="danger" onClick={() => setRemoveSlotConfirm(s)}>Gỡ xe</Button>
                    ) : (
                      <span className="text-sm font-semibold text-slate-400">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {displayedSlots.length > 0 && (
          <div className="border-t border-slate-200">
            <Pagination page={slotPage} total={displayedSlots.length} pageSize={SLOT_PAGE_SIZE} onPageChange={setSlotPage} />
          </div>
        )}
      </Card>

      {/* MODAL: đăng ký / sửa xe */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="w-full max-w-md rounded-3xl bg-white p-6 shadow-xl">
            <h3 className="mb-4 text-lg font-bold">{editingVehicle ? "Chi tiết xe" : fixedParkingSlot ? `Gán xe vào chỗ ${fixedParkingSlot.code}` : "Đăng ký xe mới"}</h3>
            <div className="space-y-4">
              {!editingVehicle && (
                <Select label="Căn hộ sở hữu" value={form.apartmentId} onChange={(e) => handleApartmentChange(e.target.value)}>
                  <option value="">{loadingApartments ? "Đang tải căn hộ..." : "Chọn căn hộ"}</option>
                  {apartmentOptions.map((apartment) => (
                    <option key={apartment.id} value={apartment.id}>
                      {apartment.code}{apartment.headOfHouseholdName ? ` - ${apartment.headOfHouseholdName}` : ""}
                    </option>
                  ))}
                </Select>
              )}
              <Input label="Biển số" placeholder="VD: 30A-12345" value={form.licensePlate} onChange={(e) => setForm({ ...form, licensePlate: e.target.value })} />
              {fixedParkingSlot ? (
                <Input label="Loại xe" value={typeLabel(form.type)} disabled />
              ) : (
                <Select label="Loại xe" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value, parkingSlotId: "" })}>
                  <option value="MOTORBIKE">Xe máy</option>
                  <option value="CAR">Ô tô</option>
                </Select>
              )}
              {!editingVehicle && (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <h4 className="mb-3 text-sm font-black text-slate-900">Thông tin gửi xe</h4>
                  <div className="space-y-4">
                    {!fixedParkingSlot && (
                      <Select label="Chỗ gửi trống" value={form.parkingSlotId} onChange={(e) => setForm({ ...form, parkingSlotId: e.target.value })}>
                        <option value="">Chưa gán chỗ gửi</option>
                        {emptySlotsForVehicleType.map((slot) => (
                          <option key={slot.id} value={slot.id}>{slot.code} - {typeLabel(slot.type)}</option>
                        ))}
                      </Select>
                    )}
                    <div className="grid gap-4 md:grid-cols-2">
                      <Input label="Từ ngày" type="date" value={form.startDate} disabled={!form.parkingSlotId} onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
                      <Input label="Đến ngày" type="date" value={form.endDate} disabled={!form.parkingSlotId} onChange={(e) => setForm({ ...form, endDate: e.target.value })} />
                    </div>
                  </div>
                </div>
              )}
              {editingVehicle && (
                <Select label="Trạng thái" value={form.active ? "ACTIVE" : "INACTIVE"} onChange={(e) => setForm({ ...form, active: e.target.value === "ACTIVE" })}>
                  <option value="ACTIVE">Đang gửi</option>
                  <option value="INACTIVE">Ngừng gửi</option>
                </Select>
              )}
              {formError && <div className="rounded-xl bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 ring-1 ring-rose-200">{formError}</div>}
              <div className="flex justify-between gap-3 pt-2">
                <div className="flex gap-3">
                  <Button variant="secondary" onClick={() => setShowForm(false)}>Hủy</Button>
                  {editingVehicle && <Button variant="danger" onClick={() => setCancelConfirm(editingVehicle)}>Huỷ đăng ký</Button>}
                </div>
                <Button onClick={handleSaveVehicle} disabled={saving}>{saving ? "Đang lưu…" : editingVehicle ? "Lưu" : "Đăng ký"}</Button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {cancelConfirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
          <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center gap-3">
              <div className="rounded-full bg-rose-100 p-3"><AlertCircle className="h-6 w-6 text-rose-600" /></div>
              <h3 className="text-lg font-bold text-slate-900">Huỷ đăng ký xe</h3>
            </div>
            <p className="mb-6 text-slate-600">Bạn có chắc muốn huỷ đăng ký xe biển số <strong>{cancelConfirm.licensePlate}</strong>?</p>
            <div className="flex justify-end gap-3">
              <Button variant="secondary" onClick={() => setCancelConfirm(null)}>Hủy</Button>
              <Button variant="danger" onClick={handleCancelVehicle}>Huỷ đăng ký</Button>
            </div>
          </motion.div>
        </div>
      )}

      {removeSlotConfirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
          <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center gap-3">
              <div className="rounded-full bg-rose-100 p-3"><AlertCircle className="h-6 w-6 text-rose-600" /></div>
              <h3 className="text-lg font-bold text-slate-900">Gỡ xe khỏi chỗ gửi</h3>
            </div>
            <p className="mb-6 text-slate-600">
              Bạn có chắc muốn gỡ xe <strong>{removeSlotConfirm.licensePlate || "này"}</strong> khỏi chỗ <strong>{removeSlotConfirm.code}</strong>?
            </p>
            <div className="flex justify-end gap-3">
              <Button variant="secondary" onClick={() => setRemoveSlotConfirm(null)}>Hủy</Button>
              <Button variant="danger" onClick={handleRemoveParkingRegistration}>Gỡ xe</Button>
            </div>
          </motion.div>
        </div>
      )}

      {/* MODAL: sinh hoá đơn phí gửi xe theo tháng */}
      {showFeeForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="w-full max-w-md rounded-3xl bg-white p-6 shadow-xl">
            <h3 className="mb-2 text-lg font-bold">Tạo hóa đơn phí gửi xe</h3>
            <p className="mb-4 text-sm text-slate-600">
              Hệ thống tạo phiếu thu phí gửi xe cho mỗi hộ (= tổng phí tháng các lượt gửi xe đang hiệu lực của hộ).
              Hóa đơn sẽ xuất hiện ở mục <strong>Thu phí / Công nợ</strong>; hộ dân có thể nộp tiền mặt hoặc thanh toán VNPay.
            </p>
            <div className="grid gap-4 md:grid-cols-2">
              <Select label="Tháng" value={feeForm.month} onChange={(e) => setFeeForm({ ...feeForm, month: Number(e.target.value) })}>
                {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => <option key={m} value={m}>Tháng {m}</option>)}
              </Select>
              <Select label="Năm" value={feeForm.year} onChange={(e) => setFeeForm({ ...feeForm, year: Number(e.target.value) })}>
                {[2024, 2025, 2026, 2027, 2028].map((y) => <option key={y} value={y}>{y}</option>)}
              </Select>
            </div>
            {feeError && <div className="mt-4 rounded-xl bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 ring-1 ring-rose-200">{feeError}</div>}
            <div className="mt-5 flex justify-end gap-3">
              <Button variant="secondary" onClick={() => setShowFeeForm(false)} disabled={feeSaving}>Hủy</Button>
              <Button onClick={handleGenerateFees} disabled={feeSaving}>{feeSaving ? "Đang tạo…" : "Tạo hóa đơn"}</Button>
            </div>
          </motion.div>
        </div>
      )}
    </>
  );
}

// ----------------------------- RESIDENT -----------------------------
function ResidentVehicles() {
  const [vehicles, setVehicles] = useState([]);
  const [regs, setRegs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState("");

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [vRes, rRes] = await Promise.all([listMyVehiclesAPI(), listMyParkingRegistrationsAPI()]);
      if (vRes.success) setVehicles(vRes.data?.items || []);
      else setPageError(vRes.message || "Không tải được danh sách xe");
      if (rRes.success) setRegs(rRes.data?.items || []);
      setLoading(false);
    })();
  }, []);

  return (
    <>
      <SectionHeader title="Xe của tôi" desc="Danh sách xe và các lượt gửi xe đang hiệu lực của hộ bạn. Liên hệ Ban quản lý để đăng ký xe mới." />

      {pageError && (
        <div className="mb-5 rounded-xl bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 ring-1 ring-rose-200">{pageError}</div>
      )}

      <Card className="mb-8 !p-0">
        <div className="border-b border-slate-200 px-5 py-5"><h3 className="font-black text-slate-900">Xe đã đăng ký</h3></div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-5 py-4">Biển số</th>
                <th className="px-5 py-4">Loại</th>
                <th className="px-5 py-4">Ngày đăng ký</th>
                <th className="px-5 py-4">Trạng thái</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading && <tr><td colSpan={4} className="px-5 py-8 text-center text-sm font-semibold text-slate-500">Đang tải…</td></tr>}
              {!loading && vehicles.length === 0 && <tr><td colSpan={4} className="px-5 py-8 text-center text-sm font-semibold text-slate-500">Hộ bạn chưa có xe nào.</td></tr>}
              {!loading && vehicles.map((v) => (
                <tr key={v.id} className="hover:bg-slate-50/80">
                  <td className="whitespace-nowrap px-5 py-4 font-semibold text-slate-800">{v.licensePlate}</td>
                  <td className="whitespace-nowrap px-5 py-4 text-slate-700">{typeLabel(v.type)}</td>
                  <td className="whitespace-nowrap px-5 py-4 text-slate-700">{v.registeredDate || "__"}</td>
                  <td className="whitespace-nowrap px-5 py-4"><Badge tone={v.active ? "green" : "gray"}>{v.active ? "Đang gửi" : "Đã huỷ"}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card className="!p-0">
        <div className="border-b border-slate-200 px-5 py-5"><h3 className="font-black text-slate-900">Lượt gửi xe</h3></div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-5 py-4">Mã chỗ</th>
                <th className="px-5 py-4">Biển số</th>
                <th className="px-5 py-4">Phí tháng</th>
                <th className="px-5 py-4">Từ ngày</th>
                <th className="px-5 py-4">Trạng thái</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {!loading && regs.length === 0 && <tr><td colSpan={5} className="px-5 py-8 text-center text-sm font-semibold text-slate-500">Hộ bạn chưa có lượt gửi xe nào.</td></tr>}
              {regs.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50/80">
                  <td className="whitespace-nowrap px-5 py-4 font-semibold text-slate-800">{r.slotCode}</td>
                  <td className="whitespace-nowrap px-5 py-4 text-slate-700">{r.licensePlate || "__"}</td>
                  <td className="whitespace-nowrap px-5 py-4 text-slate-700">{money(r.monthlyFee || 0)}</td>
                  <td className="whitespace-nowrap px-5 py-4 text-slate-700">{r.startDate || "__"}</td>
                  <td className="whitespace-nowrap px-5 py-4">{regStatusBadge(r.status)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}
