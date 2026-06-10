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

export function Vehicles({ role = "ADMIN", user }) {
  const parkingFloors = [
    { id: "T1", label: "Tầng 1", desc: "Xe máy & xe đạp", total: 108, types: ["Xe máy", "Xe đạp"], area: "450m²" },
    { id: "T2", label: "Tầng 2", desc: "Ô tô", total: 20, types: ["Ô tô"], area: "520m²" },
    { id: "T3", label: "Tầng 3", desc: "Ô tô", total: 20, types: ["Ô tô"], area: "520m²" },
    { id: "T4", label: "Tầng 4", desc: "Ô tô", total: 20, types: ["Ô tô"], area: "520m²" },
  ];

  const feeByType = {
    "Ô tô": 1200000,
    "Xe máy": 70000,
    "Xe đạp": 30000,
  };

  const emptySearchFilters = {
    plate: "",
    type: "",
    room: "",
    slot: "",
  };

  const [vehiclesList, setVehiclesList] = useDatabaseState("bluemoon_vehicles", initialVehicles);
  const [parkingRequests, setParkingRequests] = useDatabaseState("bluemoon_parking_requests", []);
  const vehiclesData = Array.isArray(vehiclesList) ? vehiclesList : [];
  const parkingRequestsData = Array.isArray(parkingRequests) ? parkingRequests : [];
  const [filteredVehicles, setFilteredVehicles] = useState(() => vehiclesData);
  const [selectedFloor, setSelectedFloor] = useState("T1");
  const [showForm, setShowForm] = useState(false);
  const [editingIndex, setEditingIndex] = useState(null);
  const [residentEditingVehicle, setResidentEditingVehicle] = useState(null);
  const [error, setError] = useState("");
  const [toast, setToast] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [searchFilters, setSearchFilters] = useState(emptySearchFilters);
  const [formData, setFormData] = useState({
    name: "",
    birthYear: "",
    idCard: "",
    plate: "",
    type: "Xe máy",
    room: "",
    fee: String(feeByType["Xe máy"]),
    slot: "",
    status: "USED",
  });

  const isAdmin = role === "ADMIN";
  const residentRoom = getResidentRoomByUser(user);
  const residentName = getResidentDisplayName(user);

  const showToast = (message, tone = "green") => {
    setToast({ message, tone });
    setTimeout(() => setToast(null), 3000);
  };

  const normalizeSlot = (slot) => {
    const value = String(slot || "").trim().toUpperCase();
    if (!value) return "";
    if (/^T[1-4]-/.test(value)) return value;

    const motorbikeMatch = value.match(/^M-?(\d+)$/);
    if (motorbikeMatch) return `T1-${String(motorbikeMatch[1]).padStart(3, "0")}`;

    const basementMatch = value.match(/^B(\d)-?(\d+)$/);
    if (basementMatch) {
      const floorMap = { 1: "T2", 2: "T3", 3: "T4" };
      return `${floorMap[basementMatch[1]] || "T2"}-${String(basementMatch[2]).padStart(3, "0")}`;
    }

    return value;
  };

  const getFloorBySlot = (slot) => {
    const normalized = normalizeSlot(slot);
    return parkingFloors.find((floor) => normalized.startsWith(`${floor.id}-`));
  };

  const makeSlotsForFloor = (floor) =>
    Array.from({ length: floor.total }, (_, index) => ({
      id: `${floor.id}-${String(index + 1).padStart(3, "0")}`,
      index: index + 1,
    }));

  const buildParkingBlocks = (slots, blockCount = 3) => {
    const perBlock = Math.ceil(slots.length / blockCount);
    const blocks = [];

    for (let blockIndex = 0; blockIndex < blockCount; blockIndex++) {
      const blockSlots = slots.slice(blockIndex * perBlock, (blockIndex + 1) * perBlock);
      if (!blockSlots.length) continue;
      const half = Math.ceil(blockSlots.length / 2);
      blocks.push({
        left: blockSlots.slice(0, half),
        right: blockSlots.slice(half),
      });
    }

    return blocks;
  };

  const selectedFloorInfo = parkingFloors.find((floor) => floor.id === selectedFloor) || parkingFloors[0];
  const selectedFloorSlots = makeSlotsForFloor(selectedFloorInfo);
  const isCarFloor = selectedFloorInfo.types.includes("Ô tô");
  const parkingBlocks = isCarFloor
    ? [
        {
          left: selectedFloorSlots.slice(0, 10),
          right: selectedFloorSlots.slice(10, 20),
        },
      ]
    : buildParkingBlocks(selectedFloorSlots, 3);

  const occupiedSlotKeys = new Set(vehiclesData.map((vehicle) => normalizeSlot(vehicle.slot)).filter(Boolean));
  const pendingRequests = parkingRequestsData.filter((request) => request.status === "pending");
  const pendingSlotKeys = new Set(pendingRequests.map((request) => normalizeSlot(request.slot)).filter(Boolean));
  const myParkingRequests = parkingRequestsData.filter(
    (request) => request.requesterUsername === user?.username || String(request.room) === String(residentRoom)
  );
  const myVehicles = vehiclesData.filter((vehicle) => String(vehicle.room) === String(residentRoom));

  const selectedFloorOccupied = selectedFloorSlots.filter((slot) => occupiedSlotKeys.has(slot.id)).length;
  const selectedFloorPending = selectedFloorSlots.filter((slot) => pendingSlotKeys.has(slot.id)).length;
  const selectedFloorAvailable = selectedFloorInfo.total - selectedFloorOccupied - selectedFloorPending;
  const totalSlots = parkingFloors.reduce((sum, floor) => sum + floor.total, 0);
  const occupiedInMap = parkingFloors.reduce((sum, floor) => {
    const slots = makeSlotsForFloor(floor);
    return sum + slots.filter((slot) => occupiedSlotKeys.has(slot.id)).length;
  }, 0);
  const pendingInMap = parkingFloors.reduce((sum, floor) => {
    const slots = makeSlotsForFloor(floor);
    return sum + slots.filter((slot) => pendingSlotKeys.has(slot.id)).length;
  }, 0);
  const totalVehicles = vehiclesData.length;
  const totalOccupied = Math.max(occupiedInMap, totalVehicles);
  const totalAvailable = Math.max(0, totalSlots - totalOccupied - pendingInMap);
  const allSlotOptions = parkingFloors.flatMap((floor) => makeSlotsForFloor(floor).map((slot) => ({ ...slot, floor })));

  const getVehicleBySlot = (slotId) => {
    const index = vehiclesData.findIndex((vehicle) => normalizeSlot(vehicle.slot) === slotId);
    return { index, vehicle: index >= 0 ? vehiclesList[index] : null };
  };

  const getPendingRequestBySlot = (slotId) =>
    pendingRequests.find((request) => normalizeSlot(request.slot) === slotId);

  const createDefaultFormData = (slotId = "") => {
    const floor = slotId ? getFloorBySlot(slotId) : selectedFloorInfo;
    const defaultType = floor?.types?.[0] || "Xe máy";
    return {
      name: isAdmin ? "" : residentName,
      birthYear: "",
      idCard: "",
      plate: "",
      type: defaultType,
      room: isAdmin ? "" : residentRoom,
      fee: String(feeByType[defaultType] || 0),
      slot: slotId,
      status: "USED",
    };
  };

  const openCreateForm = (slotId = "") => {
    setFormData(createDefaultFormData(slotId));
    setEditingIndex(null);
    setResidentEditingVehicle(null);
    setError("");
    setShowForm(true);
  };

  const handleSlotClick = (slotId) => {
    const { index, vehicle } = getVehicleBySlot(slotId);
    const pendingRequest = getPendingRequestBySlot(slotId);

    if (vehicle) {
      if (isAdmin) {
        handleEdit(index, vehicle);
      } else if (String(vehicle.room) === String(residentRoom)) {
        openResidentVehicleEdit(vehicle);
      } else {
        showToast("Chỗ gửi này đã có người gửi. Vui lòng chọn chỗ khác.", "red");
      }
      return;
    }

    if (pendingRequest) {
      if (!isAdmin && String(pendingRequest.room) === String(residentRoom)) {
        showToast("Yêu cầu của bạn đang chờ Admin duyệt.", "yellow");
      } else {
        showToast("Chỗ gửi này đang chờ Admin duyệt. Vui lòng chọn chỗ khác.", "yellow");
      }
      return;
    }

    openCreateForm(slotId);
  };

  const handleSlotChange = (slotValue) => {
    const floor = getFloorBySlot(slotValue);
    const nextType = floor?.types?.includes(formData.type) ? formData.type : floor?.types?.[0] || formData.type;
    setFormData({
      ...formData,
      slot: slotValue,
      type: nextType,
      fee: String(feeByType[nextType] || formData.fee || 0),
    });
  };

  const handleTypeChange = (type) => {
    setFormData({
      ...formData,
      type,
      fee: String(feeByType[type] || formData.fee || 0),
    });
  };

  const getSearchSource = (source = vehiclesData) => (isAdmin ? source : source.filter((vehicle) => String(vehicle.room) === String(residentRoom)));

  const filterVehicles = (source = vehiclesData) => {
    let results = getSearchSource(source);

    if (searchFilters.plate.trim()) {
      const keyword = searchFilters.plate.trim().toLowerCase();
      results = results.filter((v) => String(v.plate).toLowerCase().includes(keyword));
    }

    if (searchFilters.type.trim()) {
      results = results.filter((v) => v.type.includes(searchFilters.type.trim()));
    }

    if (searchFilters.room.trim()) {
      results = results.filter((v) => String(v.room).includes(searchFilters.room.trim()));
    }

    if (searchFilters.slot.trim()) {
      const keyword = searchFilters.slot.trim().toLowerCase();
      results = results.filter((v) => String(v.slot).toLowerCase().includes(keyword));
    }

    return results;
  };

  const handleSearch = () => {
    setFilteredVehicles(filterVehicles());
  };

  const handleResetSearch = () => {
    setSearchFilters(emptySearchFilters);
    setFilteredVehicles(getSearchSource(vehiclesData));
  };

  const validateVehicleForm = () => {
    const normalizedSlot = normalizeSlot(formData.slot.trim());
    const normalizedPlate = formData.plate.trim();

    if (!formData.name.trim() || !formData.birthYear.trim() || !formData.fee || !normalizedSlot) {
      setError("Vui lòng nhập đầy đủ thông tin và chọn chỗ gửi trên sơ đồ");
      return false;
    }

    if ((formData.type === "Xe máy" || formData.type === "Ô tô") && !normalizedPlate) {
      setError("Xe máy và ô tô bắt buộc phải nhập biển số xe");
      return false;
    }

    const selectedSlotFloor = getFloorBySlot(normalizedSlot);
    if (selectedSlotFloor && !selectedSlotFloor.types.includes(formData.type)) {
      setError(`${selectedSlotFloor.label} chỉ nhận: ${selectedSlotFloor.types.join(", ")}`);
      return false;
    }

    const slotUsed = vehiclesData.some((vehicle, index) => {
      if (index === editingIndex || normalizeSlot(vehicle.slot) !== normalizedSlot) return false;

      const isCurrentResidentVehicle =
        !isAdmin &&
        residentEditingVehicle &&
        String(vehicle.room) === String(residentRoom) &&
        normalizeSlot(vehicle.slot) === normalizeSlot(residentEditingVehicle.slot);

      return !isCurrentResidentVehicle;
    });

    if (slotUsed) {
      setError("Chỗ gửi này đã có người gửi");
      return false;
    }

    const slotPending = pendingRequests.some((request) => normalizeSlot(request.slot) === normalizedSlot);
    if (slotPending && editingIndex === null && !residentEditingVehicle) {
      setError("Chỗ gửi này đang chờ Admin duyệt");
      return false;
    }

    return true;
  };

  const handleAdd = () => {
    if (!validateVehicleForm()) return;

    const normalizedSlotKey = normalizeSlot(formData.slot.trim());
    const normalizedPlate = formData.plate.trim() || "__";
    const normalizedRoom = formData.room.trim() || "__";

    const savedVehicle = {
      name: formData.name.trim(),
      birthYear: formData.birthYear.trim(),
      idCard: formData.idCard.trim(),
      plate: normalizedPlate,
      type: formData.type,
      room: normalizedRoom,
      fee: parseInt(formData.fee || 0),
      slot: normalizedSlotKey,
      status: formData.status,
    };

    if (!isAdmin) {
      const newRequest = {
        id: `PARK-${Date.now()}`,
        ...savedVehicle,
        requestType: residentEditingVehicle ? "UPDATE" : "CREATE",
        originalSlot: residentEditingVehicle ? normalizeSlot(residentEditingVehicle.slot) : "",
        originalPlate: residentEditingVehicle ? residentEditingVehicle.plate : "",
        originalType: residentEditingVehicle ? residentEditingVehicle.type : "",
        status: "pending",
        requesterUsername: user?.username || "",
        createdAt: new Date().toLocaleString("vi-VN", {
          dateStyle: "short",
          timeStyle: "short",
        }),
      };

      setParkingRequests((prev) => [newRequest, ...(Array.isArray(prev) ? prev : [])]);
      handleCancel();
      showToast(
        residentEditingVehicle
          ? "Đã gửi yêu cầu thay đổi thông tin xe đến Admin. Vui lòng chờ duyệt."
          : "Đã gửi đăng ký gửi xe đến Admin. Vui lòng chờ duyệt.",
        "green"
      );
      return;
    }

    let updatedList;
    if (editingIndex !== null) {
      updatedList = vehiclesData.map((vehicle, index) => (index === editingIndex ? savedVehicle : vehicle));
    } else {
      updatedList = [...vehiclesData, savedVehicle];
    }

    setVehiclesList(updatedList);
    setFilteredVehicles(filterVehicles(updatedList));
    handleCancel();
  };

  const handleEdit = (index, vehicle) => {
    if (!isAdmin) return;

    const slotKey = normalizeSlot(vehicle.slot);
    setFormData({
      name: vehicle.name,
      birthYear: vehicle.birthYear,
      idCard: vehicle.idCard,
      plate: vehicle.plate === "__" ? "" : vehicle.plate,
      type: vehicle.type,
      room: vehicle.room === "__" ? "" : vehicle.room,
      fee: String(vehicle.fee || ""),
      slot: slotKey || vehicle.slot,
      status: vehicle.status,
    });
    setEditingIndex(index);
    setResidentEditingVehicle(null);
    setError("");
    setShowForm(true);
  };

  const openResidentVehicleEdit = (vehicle) => {
    const slotKey = normalizeSlot(vehicle.slot);
    setFormData({
      name: vehicle.name || residentName,
      birthYear: vehicle.birthYear || "",
      idCard: vehicle.idCard || "",
      plate: vehicle.plate === "__" ? "" : vehicle.plate,
      type: vehicle.type || "Xe máy",
      room: vehicle.room || residentRoom,
      fee: String(vehicle.fee || feeByType[vehicle.type] || 0),
      slot: slotKey || vehicle.slot,
      status: vehicle.status || "USED",
    });
    setResidentEditingVehicle(vehicle);
    setEditingIndex(null);
    setError("");
    setShowForm(true);
  };

  const handleDeleteClick = () => {
    if (editingIndex !== null) {
      const vehicle = vehiclesData[editingIndex];
      setDeleteConfirm({ index: editingIndex, plate: vehicle.plate, slot: vehicle.slot });
    }
  };

  const handleConfirmDelete = () => {
    if (deleteConfirm) {
      const updatedList = vehiclesData.filter((_, i) => i !== deleteConfirm.index);
      setVehiclesList(updatedList);
      setFilteredVehicles(filterVehicles(updatedList));
      setDeleteConfirm(null);
      setShowForm(false);
      setEditingIndex(null);
    }
  };

  const handleCancel = () => {
    setFormData(createDefaultFormData(""));
    setError("");
    setShowForm(false);
    setEditingIndex(null);
    setResidentEditingVehicle(null);
  };

  const handleApproveParkingRequest = (request) => {
    const normalizedSlot = normalizeSlot(request.slot);
    const originalSlot = normalizeSlot(request.originalSlot);
    const isUpdateRequest = request.requestType === "UPDATE";

    const slotUsed = vehiclesData.some((vehicle) => {
      if (normalizeSlot(vehicle.slot) !== normalizedSlot) return false;

      const isOriginalVehicle =
        isUpdateRequest &&
        String(vehicle.room) === String(request.room) &&
        normalizeSlot(vehicle.slot) === originalSlot;

      return !isOriginalVehicle;
    });

    if (slotUsed) {
      showToast("Không thể duyệt vì chỗ gửi này đã có người gửi.", "red");
      return;
    }

    const approvedVehicle = {
      name: request.name,
      birthYear: request.birthYear,
      idCard: request.idCard,
      plate: request.plate || "__",
      type: request.type,
      room: request.room,
      fee: Number(request.fee || feeByType[request.type] || 0),
      slot: normalizedSlot,
      status: "USED",
    };

    let updatedVehicles;
    if (isUpdateRequest) {
      let updatedExistingVehicle = false;
      updatedVehicles = vehiclesData.map((vehicle) => {
        const isOriginalVehicle =
          String(vehicle.room) === String(request.room) &&
          normalizeSlot(vehicle.slot) === originalSlot;

        if (!isOriginalVehicle) return vehicle;
        updatedExistingVehicle = true;
        return approvedVehicle;
      });

      if (!updatedExistingVehicle) {
        updatedVehicles = [...updatedVehicles, approvedVehicle];
      }
    } else {
      updatedVehicles = [...vehiclesData, approvedVehicle];
    }

    setVehiclesList(updatedVehicles);
    setFilteredVehicles(filterVehicles(updatedVehicles));

    setParkingRequests((prev) =>
      (Array.isArray(prev) ? prev : []).map((item) =>
        item.id === request.id
          ? {
              ...item,
              status: "approved",
              approvedAt: new Date().toLocaleString("vi-VN", {
                dateStyle: "short",
                timeStyle: "short",
              }),
            }
          : item
      )
    );

    showToast(
      isUpdateRequest
        ? "Đã duyệt thay đổi thông tin xe."
        : "Đã duyệt đăng ký gửi xe và thêm vào danh sách xe.",
      "green"
    );
  };

  const handleRejectParkingRequest = (request) => {
    setParkingRequests((prev) =>
      (Array.isArray(prev) ? prev : []).map((item) =>
        item.id === request.id
          ? {
              ...item,
              status: "rejected",
              rejectedAt: new Date().toLocaleString("vi-VN", {
                dateStyle: "short",
                timeStyle: "short",
              }),
            }
          : item
      )
    );

    showToast("Đã từ chối đăng ký gửi xe.", "red");
  };

  const currentSlotFloor = getFloorBySlot(formData.slot) || selectedFloorInfo;
  const allowedTypesForForm = currentSlotFloor?.types || ["Ô tô", "Xe máy", "Xe đạp"];
  const availableSlotOptions = allSlotOptions.filter(({ id }) => {
    if (editingIndex !== null && normalizeSlot(vehiclesData[editingIndex]?.slot) === id) return true;
    if (residentEditingVehicle && normalizeSlot(residentEditingVehicle.slot) === id) return true;
    return !occupiedSlotKeys.has(id) && !pendingSlotKeys.has(id);
  });

  const getSlotType = (slot) => {
    const { vehicle } = getVehicleBySlot(slot.id);
    const pendingRequest = getPendingRequestBySlot(slot.id);

    return (
      vehicle?.type ||
      pendingRequest?.type ||
      (selectedFloorInfo.types.includes("Ô tô")
        ? "Ô tô"
        : slot.index % 4 === 0
          ? "Xe đạp"
          : "Xe máy")
    );
  };

  const renderSpot = (slot) => {
    const occupied = occupiedSlotKeys.has(slot.id);
    const pending = pendingSlotKeys.has(slot.id);
    const vehicleType = getSlotType(slot);
    const isCarSpot = vehicleType === "Ô tô";
    const iconColor = occupied ? "text-rose-500" : pending ? "text-amber-500" : "text-emerald-500";

    return (
      <button
        key={slot.id}
        onClick={() => handleSlotClick(slot.id)}
        title={occupied ? `${slot.id} - đã đặt` : pending ? `${slot.id} - đang chờ duyệt` : `${slot.id} - còn trống`}
        className={`flex items-center justify-center border transition ${
          isCarSpot
            ? `h-14 rounded-xl sm:h-16 md:h-20 ${
                occupied
                  ? "border-rose-200 bg-rose-50 hover:bg-rose-100"
                  : pending
                    ? "border-amber-200 bg-amber-50 hover:bg-amber-100"
                    : "border-emerald-200 bg-emerald-50 hover:bg-emerald-100"
              }`
            : `h-8 rounded-sm sm:h-9 ${
                occupied
                  ? "border-rose-200/70 bg-rose-100/25 hover:bg-rose-100/40"
                  : pending
                    ? "border-amber-200/70 bg-amber-100/30 hover:bg-amber-100/50"
                    : "border-emerald-200/70 bg-emerald-100/20 hover:bg-emerald-100/35"
              }`
        }`}
      >
        {isCarSpot ? (
          <Car className={`h-8 w-8 sm:h-9 sm:w-9 md:h-11 md:w-11 ${iconColor}`} strokeWidth={2.2} />
        ) : (
          <Bike className={`h-3.5 w-3.5 ${iconColor}`} strokeWidth={2.2} />
        )}
      </button>
    );
  };

  const visibleVehicles = filterVehicles(vehiclesData);

  const requestStatusBadge = (status) => {
    if (status === "approved") return <Badge tone="green">Đã duyệt</Badge>;
    if (status === "rejected") return <Badge tone="red">Từ chối</Badge>;
    return <Badge tone="yellow">Chờ duyệt</Badge>;
  };

  return (
    <>
      <SectionHeader
        title={isAdmin ? "Sơ đồ bãi đỗ xe" : "Đăng ký gửi xe"}
        desc={
          isAdmin
            ? "Admin quản lý sơ đồ bãi đỗ, danh sách xe và duyệt đăng ký gửi xe của cư dân."
            : "Cư dân chọn chỗ gửi xe trên sơ đồ. Sau khi gửi, Admin sẽ duyệt trước khi chỗ gửi được xác nhận."
        }
        action={
          <Button onClick={() => openCreateForm()}>
            <Plus className="h-4 w-4" />
            {isAdmin ? "Đăng ký xe" : "Gửi đăng ký xe"}
          </Button>
        }
      />

      {toast && (
        <div
          className={`mb-5 rounded-2xl px-4 py-3 text-sm font-semibold ring-1 ${
            toast.tone === "red"
              ? "bg-rose-50 text-rose-700 ring-rose-200"
              : toast.tone === "yellow"
                ? "bg-amber-50 text-amber-700 ring-amber-200"
                : "bg-emerald-50 text-emerald-700 ring-emerald-200"
          }`}
        >
          {toast.message}
        </div>
      )}

      {!isAdmin && (
        <Card className="mb-5 border-sky-100 bg-sky-50/60">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h3 className="font-black text-slate-900">Hướng dẫn đăng ký gửi xe</h3>
              <p className="mt-1 text-sm text-slate-600">
                Bấm vào một chỗ màu xanh trên sơ đồ hoặc bấm nút <strong>Gửi đăng ký xe</strong>. Nếu muốn đổi thông tin xe đã duyệt, bấm <strong>Chi tiết</strong> ở mục Chỗ gửi xe của tôi.
              </p>
            </div>
            <Button onClick={() => openCreateForm()}><Plus className="h-4 w-4" /> Gửi đăng ký xe</Button>
          </div>
        </Card>
      )}

      {isAdmin && (
        <Card className="mb-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-black text-slate-900">Duyệt đăng ký gửi xe</h3>
              <p className="mt-1 text-sm text-slate-500">Có {pendingRequests.length} yêu cầu đang chờ duyệt.</p>
            </div>
            <Badge tone={pendingRequests.length > 0 ? "yellow" : "green"}>
              {pendingRequests.length > 0 ? "Chờ xử lý" : "Không có yêu cầu"}
            </Badge>
          </div>

          {pendingRequests.length === 0 ? (
            <div className="rounded-2xl bg-slate-50 px-4 py-5 text-center text-sm font-semibold text-slate-500">
              Không có yêu cầu gửi xe nào đang chờ duyệt.
            </div>
          ) : (
            <div className="space-y-3">
              {pendingRequests.map((request) => (
                <div key={request.id} className="grid gap-4 rounded-2xl border border-amber-200 bg-amber-50/40 p-4 md:grid-cols-[1fr_auto]">
                  <div>
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <p className="font-black text-slate-900">{request.name}</p>
                      <Badge tone="yellow">Chờ duyệt</Badge>
                    </div>
                    <div className="grid gap-2 text-sm text-slate-600 md:grid-cols-3">
                      <div><span className="font-semibold">Căn hộ:</span> {request.room}</div>
                      <div><span className="font-semibold">Yêu cầu:</span> {request.requestType === "UPDATE" ? "Đổi thông tin xe" : "Đăng ký mới"}</div>
                      <div><span className="font-semibold">Loại xe:</span> {request.type}</div>
                      <div><span className="font-semibold">Biển số:</span> {request.plate || "__"}</div>
                      <div><span className="font-semibold">Chỗ gửi:</span> {normalizeSlot(request.slot)}</div>
                      <div><span className="font-semibold">Phí tháng:</span> {money(request.fee)}</div>
                      <div><span className="font-semibold">Ngày gửi:</span> {request.createdAt}</div>
                    </div>
                  </div>
                  <div className="flex gap-2 md:flex-col md:items-end">
                    <Button onClick={() => handleApproveParkingRequest(request)}>
                      <CheckCircle2 className="h-4 w-4" /> Duyệt
                    </Button>
                    <Button variant="danger" onClick={() => handleRejectParkingRequest(request)}>
                      <AlertCircle className="h-4 w-4" /> Từ chối
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      <div className="mb-5 grid gap-4 md:grid-cols-4">
        <Card>
          <p className="text-sm font-semibold text-slate-500">Tổng chỗ đỗ toàn tòa</p>
          <p className="mt-2 text-3xl font-black text-slate-950">{totalSlots}</p>
          <p className="mt-1 text-xs text-slate-500">Tầng 1: xe máy/xe đạp • Tầng 2-4: ô tô</p>
        </Card>
        <Card>
          <p className="text-sm font-semibold text-slate-500">Tổng chỗ còn trống</p>
          <p className="mt-2 text-3xl font-black text-emerald-600">{totalAvailable}</p>
          <p className="mt-1 text-xs text-slate-500">Có thể bấm để đăng ký</p>
        </Card>
        <Card>
          <p className="text-sm font-semibold text-slate-500">Tổng chỗ đã đặt</p>
          <p className="mt-2 text-3xl font-black text-rose-600">{totalOccupied}</p>
          <p className="mt-1 text-xs text-slate-500">Đang được sử dụng</p>
        </Card>
        <Card>
          <p className="text-sm font-semibold text-slate-500">Đang chờ duyệt</p>
          <p className="mt-2 text-3xl font-black text-amber-600">{pendingInMap}</p>
          <p className="mt-1 text-xs text-slate-500">Chưa được xác nhận</p>
        </Card>
      </div>

      <Card className="mb-5">
        <div className="mb-4">
          <h3 className="font-black text-slate-900">Chọn tầng hầm đỗ xe</h3>
          <p className="mt-1 text-sm text-slate-500">Tầng 1: xe máy & xe đạp • Tầng 2-4: ô tô</p>
        </div>
        <div className="grid gap-3 md:grid-cols-4">
          {parkingFloors.map((floor) => {
            const slots = makeSlotsForFloor(floor);
            const occupied = slots.filter((slot) => occupiedSlotKeys.has(slot.id)).length;
            const pending = slots.filter((slot) => pendingSlotKeys.has(slot.id)).length;
            const available = floor.total - occupied - pending;
            const selected = selectedFloor === floor.id;
            return (
              <button
                key={floor.id}
                onClick={() => setSelectedFloor(floor.id)}
                className={`rounded-2xl border px-4 py-4 text-left transition ${selected ? "border-sky-500 bg-sky-50 text-sky-800 shadow-sm" : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"}`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-black">{floor.label}</p>
                    <p className="mt-1 text-xs text-slate-500">{floor.desc}</p>
                  </div>
                  <Car className="h-5 w-5" />
                </div>
                <p className="mt-3 text-sm font-bold text-emerald-600">{available} chỗ trống</p>
                {pending > 0 && <p className="mt-1 text-xs font-semibold text-amber-600">{pending} chờ duyệt</p>}
              </button>
            );
          })}
        </div>
      </Card>

      <Card className="mb-5">
        <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h3 className="text-lg font-black text-slate-900">Sơ đồ {selectedFloorInfo.label} - Bãi đỗ {selectedFloorInfo.desc}</h3>
            <p className="text-sm text-slate-500">Diện tích: {selectedFloorInfo.area}</p>
          </div>
          <div className="flex flex-wrap gap-3 text-xs font-semibold">
            <span className="inline-flex items-center gap-1"><span className="h-3 w-3 rounded bg-emerald-100 ring-1 ring-emerald-300" /> Trống</span>
            <span className="inline-flex items-center gap-1"><span className="h-3 w-3 rounded bg-amber-100 ring-1 ring-amber-300" /> Chờ duyệt</span>
            <span className="inline-flex items-center gap-1"><span className="h-3 w-3 rounded bg-rose-100 ring-1 ring-rose-300" /> Đã đặt</span>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4 sm:p-6">
          <div className="mb-4 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-center text-sm font-black tracking-wide text-slate-700">
            LỐI VÀO / LỐI ĐI CHÍNH
          </div>

          <div className="overflow-x-auto">
            <div className={`parking-diagram mx-auto flex items-stretch justify-center rounded-3xl border border-slate-200 bg-white ${
              isCarFloor
                ? "w-full min-w-[640px] max-w-6xl gap-6 p-6 sm:gap-8 sm:p-8"
                : "min-w-[680px] gap-4 p-4 sm:gap-5 sm:p-6"
            }`}>
              {parkingBlocks.map((block, blockIndex) => (
                <div
                  key={blockIndex}
                  className={isCarFloor ? "flex w-full items-stretch gap-5 sm:gap-8" : "flex flex-1 items-stretch gap-2 sm:gap-3"}
                >
                  <div className={isCarFloor ? "flex flex-1 flex-col gap-3 sm:gap-4" : "flex w-16 flex-col gap-1.5 sm:w-20"}>
                    {block.left.map(renderSpot)}
                  </div>

                  <div className={isCarFloor ? "flex w-16 items-center justify-center sm:w-20" : "flex w-8 items-center justify-center sm:w-10"}>
                    <div className={`parking-lane flex items-center justify-center rounded-xl border border-slate-300 bg-slate-50 px-2 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500 [writing-mode:vertical-rl] [text-orientation:mixed] ${
                      isCarFloor ? "h-40 sm:h-56" : "h-28 sm:h-36"
                    }`}>
                      Làn xe
                    </div>
                  </div>

                  <div className={isCarFloor ? "flex flex-1 flex-col gap-3 sm:gap-4" : "flex w-16 flex-col gap-1.5 sm:w-20"}>
                    {block.right.map(renderSpot)}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-center text-sm font-black tracking-wide text-slate-700">
            LỐI RA / LỐI ĐI CHÍNH
          </div>
        </div>
      </Card>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-3xl bg-white p-6 shadow-xl">
            <h3 className="mb-4 text-lg font-bold">
              {isAdmin
                ? (editingIndex !== null ? "Chi tiết đăng ký xe" : "Đăng ký xe mới")
                : residentEditingVehicle
                  ? "Gửi yêu cầu đổi thông tin xe"
                  : "Gửi đăng ký chỗ gửi xe"}
            </h3>
            {!isAdmin && (
              <div className="mb-4 rounded-xl bg-sky-50 px-4 py-3 text-sm font-semibold text-sky-700 ring-1 ring-sky-200">
                Sau khi gửi, Admin sẽ duyệt trước khi chỗ gửi xe được xác nhận.
              </div>
            )}
            <div className="space-y-4">
              <Select label="Chọn chỗ gửi" value={formData.slot} onChange={(e) => handleSlotChange(e.target.value)}>
                <option value="">Chọn chỗ gửi</option>
                {availableSlotOptions.map(({ id, floor }) => (
                  <option key={id} value={id}>{id} - {floor.label} - {floor.desc}</option>
                ))}
              </Select>

              <div className="grid gap-4">
                <Input label="Họ tên" placeholder="Nguyễn Văn A" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
                <Input label="Năm sinh" placeholder="1990" value={formData.birthYear} onChange={(e) => setFormData({ ...formData, birthYear: e.target.value })} />
                <Input label="CCCD/CMND" placeholder="Có thể bỏ trống" value={formData.idCard} onChange={(e) => setFormData({ ...formData, idCard: e.target.value })} />
              </div>

              <Select label="Loại xe" value={formData.type} onChange={(e) => handleTypeChange(e.target.value)}>
                {allowedTypesForForm.map((type) => <option key={type} value={type}>{type}</option>)}
              </Select>

              <Input
                label={formData.type === "Xe đạp" ? "Biển số" : "Biển số *"}
                placeholder={formData.type === "Xe đạp" ? "Có thể bỏ trống, hệ thống sẽ lưu là __" : "Bắt buộc với xe máy/ô tô"}
                value={formData.plate}
                onChange={(e) => setFormData({ ...formData, plate: e.target.value })}
              />
              <Input label="Căn hộ" placeholder="1201" value={formData.room} onChange={(e) => setFormData({ ...formData, room: e.target.value })} disabled={!isAdmin} />
              <Input label="Phí tháng" placeholder="1200000" value={formData.fee} onChange={(e) => setFormData({ ...formData, fee: e.target.value })} disabled={!isAdmin} />

              {isAdmin && (
                <Select label="Trạng thái" value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value })}>
                  <option value="USED">Đang dùng</option>
                  <option value="RENTED">Cho thuê</option>
                </Select>
              )}

              {error && <div className="rounded-xl bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 ring-1 ring-rose-200">{error}</div>}
              <div className="flex justify-between gap-3 pt-4">
                <div className="flex gap-3">
                  <Button variant="secondary" onClick={handleCancel}>Hủy</Button>
                  {isAdmin && editingIndex !== null && <Button variant="danger" onClick={handleDeleteClick}>Xóa xe</Button>}
                </div>
                <Button onClick={handleAdd}>
                  {isAdmin
                    ? (editingIndex !== null ? "Lưu" : "Đăng ký")
                    : residentEditingVehicle
                      ? "Gửi yêu cầu thay đổi"
                      : "Gửi đăng ký"}
                </Button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center gap-3">
              <div className="rounded-full bg-rose-100 p-3"><AlertCircle className="h-6 w-6 text-rose-600" /></div>
              <h3 className="text-lg font-bold text-slate-900">Xóa đăng ký xe</h3>
            </div>
            <p className="mb-6 text-slate-600">
              Bạn có chắc muốn xóa xe ở chỗ <strong>{deleteConfirm.slot}</strong> với biển số <strong>{deleteConfirm.plate}</strong>? Hành động này không thể hoàn tác.
            </p>
            <div className="flex justify-end gap-3">
              <Button variant="secondary" onClick={() => setDeleteConfirm(null)}>Hủy</Button>
              <Button variant="danger" onClick={handleConfirmDelete}>Xóa đăng ký</Button>
            </div>
          </motion.div>
        </div>
      )}

      {!isAdmin && (
        <Card className="mb-5">
          <h3 className="mb-4 text-lg font-black text-slate-900">Đăng ký gửi xe của tôi</h3>
          {myParkingRequests.length === 0 ? (
            <div className="rounded-2xl bg-slate-50 px-4 py-5 text-center text-sm font-semibold text-slate-500">
              Bạn chưa gửi yêu cầu đăng ký gửi xe nào.
            </div>
          ) : (
            <div className="space-y-3">
              {myParkingRequests.map((request) => (
                <div key={request.id} className="rounded-2xl border border-slate-200 p-4">
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                      <p className="font-black text-slate-900">
                        {request.requestType === "UPDATE" ? "Đổi thông tin xe" : "Đăng ký mới"} • {request.type} • {request.plate || "__"}
                      </p>
                      <p className="mt-1 text-sm text-slate-500">
                        Chỗ gửi {normalizeSlot(request.slot)} • {money(request.fee)} / tháng
                      </p>
                      {request.requestType === "UPDATE" && request.originalSlot && (
                        <p className="mt-1 text-xs text-slate-500">Chỗ cũ: {normalizeSlot(request.originalSlot)} • Biển số cũ: {request.originalPlate || "__"}</p>
                      )}
                      <p className="mt-1 text-xs text-slate-500">Ngày gửi: {request.createdAt}</p>
                    </div>
                    {requestStatusBadge(request.status)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      <Card className="mb-5 !p-0">
        <div className="border-b border-slate-200 px-5 py-5">
          <h3 className="font-black text-slate-900">{isAdmin ? "Danh sách xe đang gửi" : "Chỗ gửi xe của tôi"}</h3>
          <p className="mt-1 text-sm text-slate-500">
            {isAdmin ? "Admin có thể tìm kiếm, xem chi tiết và chỉnh sửa xe." : "Cư dân xem các chỗ gửi đã được duyệt và gửi yêu cầu đổi thông tin xe khi cần."}
          </p>

          {isAdmin && (
            <div className="mt-4">
              <div className="grid gap-3 md:grid-cols-4">
                <Input label="Biển số" placeholder="VD: 30A-12345" value={searchFilters.plate} onChange={(e) => setSearchFilters({ ...searchFilters, plate: e.target.value })} onKeyDown={(e) => e.key === "Enter" && handleSearch()} />
                <Input label="Căn hộ" placeholder="Nhập số căn" value={searchFilters.room} onChange={(e) => setSearchFilters({ ...searchFilters, room: e.target.value })} onKeyDown={(e) => e.key === "Enter" && handleSearch()} />
                <Select label="Loại xe" value={searchFilters.type} onChange={(e) => setSearchFilters({ ...searchFilters, type: e.target.value })}>
                  <option value="">Tất cả loại</option>
                  <option value="Ô tô">Ô tô</option>
                  <option value="Xe máy">Xe máy</option>
                  <option value="Xe đạp">Xe đạp</option>
                </Select>
                <Input label="Chỗ gửi" placeholder="VD: T1-008" value={searchFilters.slot} onChange={(e) => setSearchFilters({ ...searchFilters, slot: e.target.value })} onKeyDown={(e) => e.key === "Enter" && handleSearch()} />
              </div>
              <div className="mt-4 flex gap-3">
                <Button onClick={handleSearch}><Search className="h-4 w-4" /> Tìm kiếm</Button>
                <Button variant="secondary" onClick={handleResetSearch}>Xóa bộ lọc</Button>
              </div>
            </div>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-5 py-4">Biển số</th>
                <th className="px-5 py-4">Loại</th>
                <th className="px-5 py-4">Căn hộ</th>
                <th className="px-5 py-4">Chỗ gửi</th>
                <th className="px-5 py-4">Phí tháng</th>
                <th className="px-5 py-4">Trạng thái</th>
                <th className="px-5 py-4 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(isAdmin ? visibleVehicles : myVehicles).length === 0 && (
                <tr>
                  <td colSpan={7} className="px-5 py-8 text-center text-sm font-semibold text-slate-500">
                    {isAdmin ? "Chưa có xe nào trong danh sách." : "Bạn chưa có chỗ gửi xe nào được duyệt."}
                  </td>
                </tr>
              )}
              {(isAdmin ? visibleVehicles : myVehicles).map((v, idx) => {
                const originalIdx = vehiclesData.findIndex((vehicle) => vehicle.plate === v.plate && vehicle.slot === v.slot && vehicle.room === v.room && vehicle.name === v.name);
                return (
                  <tr key={`${v.slot}-${idx}`} className="hover:bg-slate-50/80">
                    <td className="whitespace-nowrap px-5 py-4 text-slate-700">{v.plate}</td>
                    <td className="whitespace-nowrap px-5 py-4 text-slate-700">{v.type}</td>
                    <td className="whitespace-nowrap px-5 py-4 text-slate-700">{v.room}</td>
                    <td className="whitespace-nowrap px-5 py-4 font-semibold text-slate-800">{normalizeSlot(v.slot)}</td>
                    <td className="whitespace-nowrap px-5 py-4 text-slate-700">{money(v.fee)}</td>
                    <td className="whitespace-nowrap px-5 py-4 text-slate-700"><Badge tone={v.status === "RENTED" ? "violet" : "green"}>{v.status === "RENTED" ? "Cho thuê" : "Đang dùng"}</Badge></td>
                    <td className="px-5 py-4 text-right">
                      {isAdmin ? (
                        <button onClick={() => handleEdit(originalIdx, v)} className="font-semibold text-sky-700 hover:text-sky-900">Chi tiết</button>
                      ) : (
                        <button onClick={() => openResidentVehicleEdit(v)} className="font-semibold text-sky-700 hover:text-sky-900">Chi tiết</button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}
