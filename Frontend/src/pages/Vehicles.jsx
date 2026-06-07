import { useState, useEffect, useCallback, useMemo } from "react";
import { motion } from "framer-motion";
import { Search, Plus, AlertCircle } from "lucide-react";
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
} from "../api/vehicleApi";
import { listSystemConfigsAPI, updateSystemConfigAPI, CONFIG_KEYS } from "../api/systemConfigApi";

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
  const [form, setForm] = useState({ householdId: "", licensePlate: "", type: "MOTORBIKE", active: true });
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const [cancelConfirm, setCancelConfirm] = useState(null);

  const [showParkForm, setShowParkForm] = useState(false);
  const [parkForm, setParkForm] = useState({ slotId: "", vehicleId: "", monthlyFee: "", startDate: "", endDate: "" });
  const [parkError, setParkError] = useState("");
  const [configs, setConfigs] = useState([]);
  const [configDraft, setConfigDraft] = useState({});
  const [configSaving, setConfigSaving] = useState("");

  // Bộ lọc chỗ gửi: ALL | OCCUPIED (đang có xe) | EMPTY (đang trống)
  const [slotFilter, setSlotFilter] = useState("ALL");

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

  const occupiedCount = slots.filter((s) => s.status !== "EMPTY").length;
  const emptyCount = slots.length - occupiedCount;
  const filterSourceSlots = lookupSlots || slots;
  const filterOccupiedCount = filterSourceSlots.filter((s) => s.status !== "EMPTY").length;
  const filterEmptyCount = filterSourceSlots.length - filterOccupiedCount;

  // Cắt trang cho danh sách chỗ gửi đã lọc/sắp xếp.
  const pagedSlots = displayedSlots.slice((slotPage - 1) * SLOT_PAGE_SIZE, slotPage * SLOT_PAGE_SIZE);

  // Đổi bộ lọc -> quay về trang 1 để không rơi vào trang rỗng.
  useEffect(() => {
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
    if (res.success) setSlots(res.data?.items || []);
  }, []);
  const loadConfigs = useCallback(async () => {
    const res = await listSystemConfigsAPI();
    if (res.success) {
      const list = res.data || [];
      setConfigs(list);
      setConfigDraft(Object.fromEntries(list.map((c) => [c.configKey, String(c.configValue ?? "")])));
    }
  }, []);

  useEffect(() => {
    loadSummary();
    loadSlots();
    loadConfigs();
  }, [loadSummary, loadSlots, loadConfigs]);

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

  const openCreateForm = () => {
    setForm({ householdId: searchHouseholdId || "", licensePlate: "", type: "MOTORBIKE", active: true });
    setEditingVehicle(null);
    setFormError("");
    setShowForm(true);
  };
  const openEditForm = (v) => {
    setForm({ householdId: String(v.householdId ?? ""), licensePlate: v.licensePlate || "", type: v.type || "MOTORBIKE", active: v.active !== false });
    setEditingVehicle(v);
    setFormError("");
    setShowForm(true);
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
        setFormError("Vui lòng nhập mã hộ (householdId)");
        return;
      }
      res = await registerVehicleAPI({ householdId: Number(form.householdId), licensePlate: plate, type: form.type });
    }
    setSaving(false);
    if (!res.success) {
      setFormError(res.message || "Lưu xe thất bại");
      return;
    }
    setShowForm(false);
    showToast(editingVehicle ? "Đã cập nhật xe" : "Đã đăng ký xe");
    const hid = editingVehicle ? loadedHousehold : String(form.householdId);
    if (hid) await loadVehicles(hid);
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
    loadSlots();
  };

  const handleCreateRegistration = async () => {
    if (!parkForm.vehicleId) { setParkError("Nhập vehicleId của xe thuộc hộ"); return; }
    const payload = {
      slotId: Number(parkForm.slotId),
      vehicleId: Number(parkForm.vehicleId),
    };
    if (parkForm.monthlyFee) payload.monthlyFee = Number(parkForm.monthlyFee);
    if (parkForm.startDate) payload.startDate = parkForm.startDate;
    if (parkForm.endDate) payload.endDate = parkForm.endDate;

    const res = await createParkingRegistrationAPI(payload);
    if (!res.success) {
      setParkError(res.message || "Tạo lượt gửi xe thất bại");
      return;
    }
    setShowParkForm(false);
    showToast("Đã tạo lượt gửi xe");
    loadSlots();
    loadSummary();
  };

  return (
    <>
      <SectionHeader
        title="Quản lý gửi xe"
        desc="Đăng ký xe cho hộ, quản lý chỗ gửi và các lượt gửi/cho thuê. Tra cứu xe theo từng hộ."
        action={<Button onClick={openCreateForm}><Plus className="h-4 w-4" /> Đăng ký xe</Button>}
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
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {displayedSlots.length === 0 && (
                <tr><td colSpan={5} className="px-5 py-8 text-center text-sm font-semibold text-slate-500">
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
            <h3 className="mb-4 text-lg font-bold">{editingVehicle ? "Chi tiết xe" : "Đăng ký xe mới"}</h3>
            <div className="space-y-4">
              <Input label="Mã hộ (householdId)" placeholder="VD: 1" value={form.householdId} disabled={!!editingVehicle} onChange={(e) => setForm({ ...form, householdId: e.target.value })} />
              <Input label="Biển số" placeholder="VD: 30A-12345" value={form.licensePlate} onChange={(e) => setForm({ ...form, licensePlate: e.target.value })} />
              <Select label="Loại xe" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                <option value="MOTORBIKE">Xe máy</option>
                <option value="CAR">Ô tô</option>
              </Select>
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

      {/* MODAL: tạo lượt gửi xe (chỉ hỗ trợ gán xe của hộ) */}
      {showParkForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="w-full max-w-md rounded-3xl bg-white p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <h3 className="mb-4 text-lg font-bold">Gán xe hộ vào chỗ gửi</h3>
            <div className="space-y-4">
              <Input label="Mã xe (vehicleId)" placeholder="VD: 5" value={parkForm.vehicleId} onChange={(e) => setParkForm({ ...parkForm, vehicleId: e.target.value })} />
              <Input label="Phí tháng (đ) — bỏ trống để dùng phí mặc định" type="number" value={parkForm.monthlyFee} onChange={(e) => setParkForm({ ...parkForm, monthlyFee: e.target.value })} />
              <div className="grid gap-4 md:grid-cols-2">
                <Input label="Từ ngày" type="date" value={parkForm.startDate} onChange={(e) => setParkForm({ ...parkForm, startDate: e.target.value })} />
                <Input label="Đến ngày" type="date" value={parkForm.endDate} onChange={(e) => setParkForm({ ...parkForm, endDate: e.target.value })} />
              </div>
              {parkError && <div className="rounded-xl bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 ring-1 ring-rose-200">{parkError}</div>}
              <div className="flex justify-end gap-3 pt-2">
                <Button variant="secondary" onClick={() => setShowParkForm(false)}>Hủy</Button>
                <Button onClick={handleCreateRegistration}>Tạo lượt gửi</Button>
              </div>
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
