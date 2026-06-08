import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Search, Home, Users, KeyRound, UserPlus, LogOut, ShieldCheck, Lock, Unlock, Copy } from "lucide-react";
import { Button, Input, Select, StatusBadge, Badge } from "../components/common";
import { SectionHeader } from "../components/layout/SectionHeader";
import { listApartmentsAPI, searchApartmentsAPI, getApartmentDetailAPI } from "../api/apartmentApi";
import {
  updateHouseholdAPI,
  moveInAPI,
  addMemberAPI,
  moveOutByHouseholdIdAPI,
  getHouseholdAccountsAPI,
} from "../api/householdApi";
import { grantAccessAPI, lockUserAPI, unlockUserAPI } from "../api/authApi";
import { moveOutResidentAPI } from "../api/residentApi";

const PAGE_SIZE = 20;

// Map nhãn tầng/trạng thái trên UI -> giá trị backend
const STATUS_MAP = { "Đang ở": "OCCUPIED", "Đang trống": "AVAILABLE" };
const GENDER_LABEL = { MALE: "Nam", FEMALE: "Nữ", OTHER: "Khác" };

const yearOf = (dateStr) => (dateStr ? String(dateStr).slice(0, 4) : "—");
const buildHouseholdForm = (household) => ({
  headResidentId: household?.headOfHousehold?.id ? String(household.headOfHousehold.id) : "",
  relations: Object.fromEntries((household?.residents || []).map((member) => [member.id, member.relationToHead || ""])),
});

const emptyMoveIn = {
  householdCode: "",
  moveInDate: "",
  fullName: "",
  idCard: "",
  dateOfBirth: "",
  gender: "MALE",
  relationToHead: "Chủ hộ",
  residencyStatus: "PERMANENT",
  createAccount: true,
};

const emptyMember = {
  fullName: "",
  idCard: "",
  dateOfBirth: "",
  gender: "MALE",
  relationToHead: "",
  residencyStatus: "PERMANENT",
};

// Thẻ hiển thị tài khoản vừa cấp: username + mật khẩu tạm (chỉ hiện 1 lần).
function CredentialCard({ account }) {
  if (!account) return null;
  const copy = (text) => navigator.clipboard?.writeText(text).catch(() => {});
  return (
    <div className="mb-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
      <div className="mb-2 flex items-center gap-2 text-sm font-bold text-emerald-800">
        <ShieldCheck className="h-4 w-4" /> Tài khoản đã được cấp cho {account.residentName}
      </div>
      <p className="mb-3 text-xs font-semibold text-emerald-700">
        Hãy ghi lại và bàn giao cho cư dân — mật khẩu tạm chỉ hiển thị một lần.
      </p>
      <div className="grid gap-2 sm:grid-cols-2">
        <div className="flex items-center justify-between gap-2 rounded-xl bg-white px-3 py-2 ring-1 ring-emerald-200">
          <div>
            <p className="text-xs font-bold uppercase text-slate-500">Tên đăng nhập</p>
            <p className="font-mono text-sm font-bold text-slate-900">{account.username}</p>
          </div>
          <button onClick={() => copy(account.username)} className="text-emerald-700 hover:text-emerald-900"><Copy className="h-4 w-4" /></button>
        </div>
        <div className="flex items-center justify-between gap-2 rounded-xl bg-white px-3 py-2 ring-1 ring-emerald-200">
          <div>
            <p className="text-xs font-bold uppercase text-slate-500">Mật khẩu tạm</p>
            <p className="font-mono text-sm font-bold text-slate-900">{account.temporaryPassword}</p>
          </div>
          <button onClick={() => copy(account.temporaryPassword)} className="text-emerald-700 hover:text-emerald-900"><Copy className="h-4 w-4" /></button>
        </div>
      </div>
    </div>
  );
}

export function Apartments() {
  const [apartments, setApartments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);

  const [selectedApartment, setSelectedApartment] = useState(null);
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState("");
  const [activeTab, setActiveTab] = useState("info");

  // Tab Hộ gia đình - cập nhật chủ hộ / quan hệ
  const [householdForm, setHouseholdForm] = useState(buildHouseholdForm(null));
  const [householdActionMsg, setHouseholdActionMsg] = useState("");
  const [householdActionError, setHouseholdActionError] = useState("");
  const [savingHousehold, setSavingHousehold] = useState(false);
  const [moveOutConfirm, setMoveOutConfirm] = useState(false);

  // Bàn giao nhà (move-in)
  const [moveInForm, setMoveInForm] = useState(emptyMoveIn);
  const [movingIn, setMovingIn] = useState(false);
  const [moveInError, setMoveInError] = useState("");

  // Thêm thành viên
  const [showMemberForm, setShowMemberForm] = useState(false);
  const [memberForm, setMemberForm] = useState(emptyMember);
  const [savingMember, setSavingMember] = useState(false);
  const [memberError, setMemberError] = useState("");
  const [memberMoveOut, setMemberMoveOut] = useState(null); // nhân khẩu chờ xác nhận chuyển đi

  // Tab Tài khoản
  const [accounts, setAccounts] = useState([]);
  const [accountsLoading, setAccountsLoading] = useState(false);
  const [accountsError, setAccountsError] = useState("");
  const [grantingId, setGrantingId] = useState(null);
  const [newCredential, setNewCredential] = useState(null);

  const [filters, setFilters] = useState({ code: "", floor: "Tất cả tầng", status: "Tất cả", owner: "" });
  const [appliedFilters, setAppliedFilters] = useState(null);

  const loadPage = async (targetPage = 0, applied = appliedFilters) => {
    setLoading(true);
    setError("");
    const res = applied
      ? await searchApartmentsAPI({ ...applied, page: targetPage, size: PAGE_SIZE })
      : await listApartmentsAPI({ page: targetPage, size: PAGE_SIZE });

    if (res.success && res.data) {
      setApartments(res.data.items || []);
      setTotalPages(res.data.totalPages || 0);
      setTotalElements(res.data.totalElements || 0);
      setPage(res.data.page ?? targetPage);
    } else {
      setApartments([]);
      setTotalPages(0);
      setTotalElements(0);
      setError(res.message || "Không tải được danh sách căn hộ.");
    }
    setLoading(false);
  };

  useEffect(() => {
    loadPage(0, null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSearch = () => {
    const applied = {};
    if (filters.code.trim()) applied.code = filters.code.trim();
    if (filters.floor !== "Tất cả tầng") {
      const floorNum = parseInt(filters.floor.replace("Tầng ", ""), 10);
      if (!Number.isNaN(floorNum)) applied.floor = floorNum;
    }
    if (filters.status !== "Tất cả" && STATUS_MAP[filters.status]) applied.status = STATUS_MAP[filters.status];
    if (filters.owner.trim()) applied.headName = filters.owner.trim();
    setAppliedFilters(applied);
    loadPage(0, applied);
  };

  const handleReset = () => {
    setFilters({ code: "", floor: "Tất cả tầng", status: "Tất cả", owner: "" });
    setAppliedFilters(null);
    loadPage(0, null);
  };

  const resetModalState = () => {
    setActiveTab("info");
    setHouseholdActionMsg("");
    setHouseholdActionError("");
    setMoveOutConfirm(false);
    setMoveInForm(emptyMoveIn);
    setMoveInError("");
    setShowMemberForm(false);
    setMemberForm(emptyMember);
    setMemberError("");
    setAccounts([]);
    setAccountsError("");
    setNewCredential(null);
  };

  const openDetail = async (apartment) => {
    setSelectedApartment(apartment);
    setDetail(null);
    setDetailError("");
    resetModalState();
    setDetailLoading(true);
    const res = await getApartmentDetailAPI(apartment.id);
    if (res.success && res.data) {
      setDetail(res.data);
      setHouseholdForm(buildHouseholdForm(res.data.currentHousehold));
    } else {
      setDetailError(res.message || "Không tải được chi tiết căn hộ.");
    }
    setDetailLoading(false);
  };

  const closeDetail = () => {
    setSelectedApartment(null);
    setDetail(null);
    setDetailError("");
    resetModalState();
  };

  const household = detail?.currentHousehold || null;
  const members = (household?.residents || []).filter(
    (member) => member.status !== "MOVED_OUT" && member.residencyStatus !== "MOVED_OUT"
  );

  const refreshApartmentDetail = async () => {
    if (!selectedApartment) return;
    const res = await getApartmentDetailAPI(selectedApartment.id);
    if (res.success && res.data) {
      setDetail(res.data);
      setHouseholdForm(buildHouseholdForm(res.data.currentHousehold));
      setSelectedApartment((prev) => prev ? {
        ...prev,
        status: res.data.status,
        headOfHouseholdName: res.data.currentHousehold?.headOfHousehold?.fullName || null,
        currentHouseholdCode: res.data.currentHousehold?.code || null,
      } : prev);
    }
  };

  // ---------------- Tab Hộ gia đình: cập nhật chủ hộ / quan hệ ----------------
  const handleRelationChange = (memberId, value) => {
    setHouseholdForm((prev) => ({ ...prev, relations: { ...prev.relations, [memberId]: value } }));
  };

  const handleSaveHousehold = async () => {
    if (!selectedApartment || !household) return;
    if (!householdForm.headResidentId) {
      setHouseholdActionError("Vui lòng chọn chủ hộ.");
      return;
    }
    setSavingHousehold(true);
    setHouseholdActionMsg("");
    setHouseholdActionError("");
    const res = await updateHouseholdAPI(selectedApartment.id, {
      action: "UPDATE",
      headResidentId: Number(householdForm.headResidentId),
      memberRelations: members.map((member) => ({
        residentId: member.id,
        relationToHead: householdForm.relations[member.id] || "",
      })),
    });
    setSavingHousehold(false);
    if (res.success) {
      setHouseholdActionMsg(res.message || "Đã cập nhật thông tin hộ.");
      await refreshApartmentDetail();
      loadPage(page);
    } else {
      setHouseholdActionError(res.message || "Cập nhật thông tin hộ thất bại.");
    }
  };

  const handleMoveOutHousehold = async () => {
    if (!household) return;
    setSavingHousehold(true);
    setHouseholdActionMsg("");
    setHouseholdActionError("");
    const res = await moveOutByHouseholdIdAPI(household.id);
    setSavingHousehold(false);
    setMoveOutConfirm(false);
    if (res.success) {
      setHouseholdActionMsg(res.message || "Đã chuyển hộ ra khỏi căn hộ. Tài khoản cư dân của hộ đã bị khóa.");
      await refreshApartmentDetail();
      loadPage(page);
    } else {
      setHouseholdActionError(res.message || "Chuyển hộ ra khỏi căn hộ thất bại.");
    }
  };

  // ---------------- Bàn giao nhà (move-in) ----------------
  const handleMoveIn = async () => {
    if (!selectedApartment) return;
    setMoveInError("");
    if (!moveInForm.householdCode.trim() || !moveInForm.moveInDate || !moveInForm.fullName.trim()) {
      setMoveInError("Vui lòng nhập: mã hộ khẩu, ngày chuyển đến và họ tên chủ hộ.");
      return;
    }
    setMovingIn(true);
    const res = await moveInAPI({
      apartmentCode: selectedApartment.code,
      householdCode: moveInForm.householdCode.trim(),
      moveInDate: moveInForm.moveInDate,
      headOfHousehold: {
        fullName: moveInForm.fullName.trim(),
        idCard: moveInForm.idCard.trim() || null,
        dateOfBirth: moveInForm.dateOfBirth || null,
        gender: moveInForm.gender,
        relationToHead: moveInForm.relationToHead.trim() || "Chủ hộ",
        residencyStatus: moveInForm.residencyStatus,
      },
      createAccount: moveInForm.createAccount,
    });
    setMovingIn(false);
    if (res.success) {
      setHouseholdActionMsg(res.message || "Bàn giao căn hộ thành công.");
      setNewCredential(res.data?.account || null);
      setMoveInForm(emptyMoveIn);
      await refreshApartmentDetail();
      loadPage(page);
      setActiveTab(res.data?.account ? "accounts" : "household");
      if (res.data?.account) loadAccounts(res.data.household?.id);
    } else {
      setMoveInError(res.message || "Bàn giao căn hộ thất bại.");
    }
  };

  // ---------------- Thêm thành viên ----------------
  const handleAddMember = async () => {
    if (!household) return;
    setMemberError("");
    if (!memberForm.fullName.trim() || !memberForm.idCard.trim() || !memberForm.dateOfBirth || !memberForm.relationToHead.trim()) {
      setMemberError("Vui lòng nhập đầy đủ: họ tên, CCCD/CMND, ngày sinh, quan hệ.");
      return;
    }
    setSavingMember(true);
    const res = await addMemberAPI(household.id, {
      fullName: memberForm.fullName.trim(),
      idCard: memberForm.idCard.trim(),
      dateOfBirth: memberForm.dateOfBirth,
      gender: memberForm.gender,
      relationToHead: memberForm.relationToHead.trim(),
      residencyStatus: memberForm.residencyStatus || undefined,
    });
    setSavingMember(false);
    if (res.success) {
      setShowMemberForm(false);
      setMemberForm(emptyMember);
      setHouseholdActionMsg(res.message || "Đã thêm thành viên vào hộ.");
      await refreshApartmentDetail();
    } else {
      setMemberError(res.message || "Thêm thành viên thất bại.");
    }
  };

  const handleMemberMoveOut = async () => {
    if (!memberMoveOut) return;
    setSavingMember(true);
    const res = await moveOutResidentAPI(memberMoveOut.id);
    setSavingMember(false);
    setMemberMoveOut(null);
    if (res.success) {
      setHouseholdActionMsg(res.message || "Đã chuyển nhân khẩu khỏi hộ.");
      await refreshApartmentDetail();
    } else {
      setHouseholdActionError(res.message || "Chuyển nhân khẩu khỏi hộ thất bại.");
    }
  };

  // ---------------- Tab Tài khoản ----------------
  const loadAccounts = async (householdId) => {
    const hid = householdId || household?.id;
    if (!hid) return;
    setAccountsLoading(true);
    setAccountsError("");
    const res = await getHouseholdAccountsAPI(hid);
    if (res.success) {
      setAccounts(Array.isArray(res.data) ? res.data : []);
    } else {
      setAccountsError(res.message || "Không tải được danh sách tài khoản.");
    }
    setAccountsLoading(false);
  };

  const goToTab = (tab) => {
    setActiveTab(tab);
    if (tab === "accounts") loadAccounts();
  };

  const handleGrantAccess = async (resident) => {
    setGrantingId(resident.id);
    setAccountsError("");
    setNewCredential(null);
    const res = await grantAccessAPI(resident.id);
    setGrantingId(null);
    if (res.success) {
      setNewCredential(res.data || null);
      loadAccounts();
    } else {
      setAccountsError(res.message || "Cấp tài khoản thất bại.");
    }
  };

  const handleToggleLock = async (account) => {
    const res = account.active ? await lockUserAPI(account.id) : await unlockUserAPI(account.id);
    if (res.success) {
      loadAccounts();
    } else {
      setAccountsError(res.message || "Đổi trạng thái khóa thất bại.");
    }
  };

  // Nhân khẩu chưa có tài khoản (để hiện nút "Cấp tài khoản")
  const accountResidentIds = new Set(accounts.map((a) => a.residentId).filter(Boolean));
  const residentsWithoutAccount = members.filter((m) => !accountResidentIds.has(m.id));

  const TabButton = ({ id, icon: Icon, label }) => (
    <button
      onClick={() => goToTab(id)}
      className={`inline-flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-semibold transition ${
        activeTab === id ? "border-sky-600 text-sky-700" : "border-transparent text-slate-500 hover:text-slate-700"
      }`}
    >
      <Icon className="h-4 w-4" /> {label}
    </button>
  );

  return (
    <>
      <SectionHeader title="Quản lý căn hộ" desc="Lấy căn hộ làm trung tâm: bàn giao, thêm thành viên, cấp tài khoản và chuyển hộ ngay tại đây." />

      <div className="mb-5 grid gap-3 md:grid-cols-4">
        <Input label="Số căn hộ" placeholder="VD: A12-01" value={filters.code}
          onChange={(e) => setFilters({ ...filters, code: e.target.value })}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()} />
        <Select label="Tầng" value={filters.floor} onChange={(e) => setFilters({ ...filters, floor: e.target.value })}>
          <option>Tất cả tầng</option>
          {Array.from({ length: 26 }, (_, i) => <option key={i + 1}>{`Tầng ${i + 1}`}</option>)}
        </Select>
        <Select label="Trạng thái" value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })}>
          <option>Tất cả</option>
          <option>Đang ở</option>
          <option>Đang trống</option>
        </Select>
        <Input label="Tên chủ hộ" placeholder="Nhập tên chủ hộ" value={filters.owner}
          onChange={(e) => setFilters({ ...filters, owner: e.target.value })}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()} />
      </div>

      <div className="mb-5 flex gap-3">
        <Button onClick={handleSearch}><Search className="h-4 w-4" /> Tìm kiếm</Button>
        <Button variant="secondary" onClick={handleReset}>Xoá bộ lọc</Button>
      </div>

      {error && (
        <div className="mb-5 rounded-xl bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 ring-1 ring-rose-200">{error}</div>
      )}

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-5 py-4">Số căn</th>
                <th className="px-5 py-4">Tầng</th>
                <th className="px-5 py-4">Diện tích</th>
                <th className="px-5 py-4">Chủ hộ</th>
                <th className="px-5 py-4">Mã hộ khẩu</th>
                <th className="px-5 py-4">Trạng thái</th>
                <th className="px-5 py-4 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={7} className="px-5 py-10 text-center text-sm font-semibold text-slate-500">Đang tải dữ liệu…</td></tr>
              ) : apartments.length === 0 ? (
                <tr><td colSpan={7} className="px-5 py-10 text-center text-sm font-semibold text-slate-500">Không có căn hộ phù hợp.</td></tr>
              ) : (
                apartments.map((apartment) => (
                  <tr key={apartment.id} className="hover:bg-slate-50/80">
                    <td className="whitespace-nowrap px-5 py-4 font-semibold text-slate-800">{apartment.code}</td>
                    <td className="whitespace-nowrap px-5 py-4 text-slate-700">{apartment.floor}</td>
                    <td className="whitespace-nowrap px-5 py-4 text-slate-700">{apartment.area} m²</td>
                    <td className="whitespace-nowrap px-5 py-4 text-slate-700">{apartment.headOfHouseholdName || "—"}</td>
                    <td className="whitespace-nowrap px-5 py-4 text-slate-700">{apartment.currentHouseholdCode || "—"}</td>
                    <td className="whitespace-nowrap px-5 py-4"><StatusBadge status={apartment.status} /></td>
                    <td className="px-5 py-4 text-right">
                      <button onClick={() => openDetail(apartment)} className="font-semibold text-sky-700 hover:text-sky-900">Chi tiết</button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between">
          <p className="text-sm text-slate-500">Tổng {totalElements} căn hộ • Trang {page + 1}/{totalPages}</p>
          <div className="flex gap-2">
            <Button variant="secondary" disabled={page <= 0 || loading} onClick={() => loadPage(page - 1)}>Trước</Button>
            <Button variant="secondary" disabled={page >= totalPages - 1 || loading} onClick={() => loadPage(page + 1)}>Sau</Button>
          </div>
        </div>
      )}

      {selectedApartment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 12 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl"
          >
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <h3 className="text-xl font-black text-slate-900">Căn hộ {selectedApartment.code}</h3>
                <p className="mt-1 text-sm text-slate-500">
                  Tầng {selectedApartment.floor} • {selectedApartment.area} m² • Chủ hộ: {household?.headOfHousehold?.fullName || "—"}
                </p>
              </div>
              <StatusBadge status={detail?.status || selectedApartment.status} />
            </div>

            {/* Tabs */}
            <div className="mb-5 flex gap-1 border-b border-slate-200">
              <TabButton id="info" icon={Home} label="Thông tin chung" />
              <TabButton id="household" icon={Users} label="Hộ gia đình" />
              <TabButton id="accounts" icon={KeyRound} label="Tài khoản" />
            </div>

            {householdActionMsg && (
              <div className="mb-4 rounded-xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700 ring-1 ring-emerald-200">{householdActionMsg}</div>
            )}

            {detailLoading ? (
              <div className="rounded-2xl bg-slate-50 px-4 py-10 text-center text-sm font-semibold text-slate-500 ring-1 ring-slate-200">Đang tải chi tiết căn hộ…</div>
            ) : detailError ? (
              <div className="rounded-2xl bg-rose-50 px-4 py-6 text-center text-sm font-semibold text-rose-700 ring-1 ring-rose-200">{detailError}</div>
            ) : (
              <>
                {/* TAB 1: Thông tin chung */}
                {activeTab === "info" && (
                  <div className="grid gap-4 md:grid-cols-3">
                    <Info label="Số căn" value={detail?.code} />
                    <Info label="Tầng" value={detail?.floor} />
                    <Info label="Diện tích" value={`${detail?.area} m²`} />
                    <Info label="Mã hộ khẩu" value={household?.code || "—"} />
                    <Info label="Ngày chuyển đến" value={household?.moveInDate || "—"} />
                    <Info label="Số nhân khẩu" value={members.length} />
                    {detail?.note && <div className="md:col-span-3"><Info label="Ghi chú" value={detail.note} /></div>}
                  </div>
                )}

                {/* TAB 2: Hộ gia đình */}
                {activeTab === "household" && (
                  <div>
                    {!household ? (
                      // Căn hộ trống -> nút lớn Bàn giao
                      <div>
                        {!moveInForm._open ? (
                          <div className="rounded-2xl border-2 border-dashed border-sky-200 bg-sky-50/50 p-8 text-center">
                            <Home className="mx-auto mb-3 h-10 w-10 text-sky-500" />
                            <p className="mb-4 text-sm font-semibold text-slate-600">Căn hộ đang trống. Bắt đầu bằng việc bàn giao cho một hộ mới.</p>
                            <Button onClick={() => setMoveInForm((p) => ({ ...p, _open: true }))} className="mx-auto text-base">
                              <Home className="h-5 w-5" /> Bàn giao căn hộ mới
                            </Button>
                          </div>
                        ) : (
                          <div className="rounded-2xl border border-slate-200 p-5">
                            <h4 className="mb-4 text-lg font-black text-slate-900">Bàn giao căn hộ {selectedApartment.code}</h4>
                            <div className="grid gap-4 md:grid-cols-2">
                              <Input label="Mã hộ khẩu" placeholder="VD: HK-A1201" value={moveInForm.householdCode}
                                onChange={(e) => setMoveInForm({ ...moveInForm, householdCode: e.target.value })} />
                              <Input label="Ngày chuyển đến" type="date" value={moveInForm.moveInDate}
                                onChange={(e) => setMoveInForm({ ...moveInForm, moveInDate: e.target.value })} />
                              <Input label="Họ tên chủ hộ" placeholder="Nguyễn Văn A" value={moveInForm.fullName}
                                onChange={(e) => setMoveInForm({ ...moveInForm, fullName: e.target.value })} />
                              <Input label="CCCD/CMND" placeholder="9 hoặc 12 chữ số" value={moveInForm.idCard}
                                onChange={(e) => setMoveInForm({ ...moveInForm, idCard: e.target.value })} />
                              <Input label="Ngày sinh" type="date" value={moveInForm.dateOfBirth}
                                onChange={(e) => setMoveInForm({ ...moveInForm, dateOfBirth: e.target.value })} />
                              <Select label="Giới tính" value={moveInForm.gender}
                                onChange={(e) => setMoveInForm({ ...moveInForm, gender: e.target.value })}>
                                <option value="MALE">Nam</option><option value="FEMALE">Nữ</option><option value="OTHER">Khác</option>
                              </Select>
                              <Select label="Cư trú" value={moveInForm.residencyStatus}
                                onChange={(e) => setMoveInForm({ ...moveInForm, residencyStatus: e.target.value })}>
                                <option value="PERMANENT">Thường trú</option><option value="TEMPORARY">Tạm trú</option>
                              </Select>
                            </div>
                            <label className="mt-4 flex items-center gap-2 text-sm font-semibold text-slate-700">
                              <input type="checkbox" checked={moveInForm.createAccount}
                                onChange={(e) => setMoveInForm({ ...moveInForm, createAccount: e.target.checked })} />
                              Tạo luôn tài khoản đăng nhập cho chủ hộ
                            </label>
                            {moveInError && <div className="mt-4 rounded-xl bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 ring-1 ring-rose-200">{moveInError}</div>}
                            <div className="mt-5 flex justify-end gap-3">
                              <Button variant="secondary" onClick={() => setMoveInForm(emptyMoveIn)} disabled={movingIn}>Hủy</Button>
                              <Button onClick={handleMoveIn} disabled={movingIn}>{movingIn ? "Đang bàn giao…" : "Xác nhận bàn giao"}</Button>
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div>
                        <div className="mb-4 flex items-center justify-between">
                          <h4 className="text-lg font-black text-slate-900">Thành viên trong hộ ({members.length})</h4>
                          <Button variant="soft" onClick={() => { setShowMemberForm(true); setMemberError(""); }}>
                            <UserPlus className="h-4 w-4" /> Thêm thành viên
                          </Button>
                        </div>

                        {members.length === 0 ? (
                          <div className="rounded-2xl bg-slate-50 px-4 py-6 text-center text-sm font-semibold text-slate-500 ring-1 ring-slate-200">Hộ chưa có nhân khẩu.</div>
                        ) : (
                          <div className="overflow-hidden rounded-2xl border border-slate-200">
                            <table className="min-w-full divide-y divide-slate-200 text-sm">
                              <thead className="bg-slate-50 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
                                <tr>
                                  <th className="px-4 py-3">Họ tên</th><th className="px-4 py-3">Năm sinh</th>
                                  <th className="px-4 py-3">CCCD/CMND</th><th className="px-4 py-3">Quan hệ</th><th className="px-4 py-3">Cư trú</th>
                                  <th className="px-4 py-3 text-right">Thao tác</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100">
                                {members.map((member) => {
                                  const isHead = household.headOfHousehold?.id === member.id;
                                  return (
                                  <tr key={member.id}>
                                    <td className="px-4 py-3 font-semibold text-slate-800">
                                      {member.fullName}
                                      {isHead && <Badge tone="blue">Chủ hộ</Badge>}
                                    </td>
                                    <td className="px-4 py-3 text-slate-700">{yearOf(member.dateOfBirth)}</td>
                                    <td className="px-4 py-3 text-slate-700">{member.idCard || "—"}</td>
                                    <td className="px-4 py-3 text-slate-700">{member.relationToHead || "—"}</td>
                                    <td className="px-4 py-3"><StatusBadge status={member.residencyStatus} /></td>
                                    <td className="px-4 py-3 text-right">
                                      {isHead ? (
                                        <span className="text-xs text-slate-400">—</span>
                                      ) : (
                                        <button onClick={() => setMemberMoveOut(member)}
                                          className="inline-flex items-center gap-1 font-semibold text-rose-600 hover:text-rose-800">
                                          <LogOut className="h-4 w-4" /> Chuyển đi
                                        </button>
                                      )}
                                    </td>
                                  </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        )}

                        {/* Cập nhật chủ hộ + quan hệ */}
                        {members.length > 0 && (
                          <div className="mt-5 rounded-2xl border border-slate-200 p-4">
                            <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
                              <div className="min-w-64 flex-1">
                                <Select label="Chủ hộ" value={householdForm.headResidentId}
                                  onChange={(e) => setHouseholdForm((prev) => ({ ...prev, headResidentId: e.target.value }))}>
                                  <option value="">Chọn chủ hộ</option>
                                  {members.map((member) => <option key={member.id} value={member.id}>{member.fullName}</option>)}
                                </Select>
                              </div>
                              <div className="flex flex-wrap gap-2">
                                <Button onClick={handleSaveHousehold} disabled={savingHousehold}>Lưu thay đổi hộ</Button>
                                <Button variant="danger" onClick={() => setMoveOutConfirm(true)} disabled={savingHousehold}>
                                  <LogOut className="h-4 w-4" /> Chuyển cả hộ đi
                                </Button>
                              </div>
                            </div>

                            {householdActionError && (
                              <div className="mb-4 rounded-xl bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 ring-1 ring-rose-200">{householdActionError}</div>
                            )}

                            <div className="grid gap-3 md:grid-cols-2">
                              {members.map((member) => (
                                <Input key={member.id} label={`Quan hệ - ${member.fullName}`}
                                  value={householdForm.relations[member.id] || ""}
                                  onChange={(e) => handleRelationChange(member.id, e.target.value)} />
                              ))}
                            </div>

                            {moveOutConfirm && (
                              <div className="mt-4 rounded-xl bg-rose-50 p-4 ring-1 ring-rose-200">
                                <p className="mb-3 text-sm font-semibold text-rose-800">
                                  Chuyển cả hộ ra khỏi căn hộ? Tất cả nhân khẩu sẽ chuyển sang "Đã chuyển đi", căn hộ thành trống và toàn bộ tài khoản cư dân của hộ sẽ bị khóa.
                                </p>
                                <div className="flex justify-end gap-2">
                                  <Button variant="secondary" onClick={() => setMoveOutConfirm(false)} disabled={savingHousehold}>Hủy</Button>
                                  <Button variant="danger" onClick={handleMoveOutHousehold} disabled={savingHousehold}>
                                    {savingHousehold ? "Đang chuyển…" : "Xác nhận chuyển hộ"}
                                  </Button>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* TAB 3: Tài khoản */}
                {activeTab === "accounts" && (
                  <div>
                    {!household ? (
                      <div className="rounded-2xl bg-slate-50 px-4 py-6 text-center text-sm font-semibold text-slate-500 ring-1 ring-slate-200">
                        Căn hộ đang trống — chưa có hộ để cấp tài khoản. Hãy bàn giao căn hộ trước.
                      </div>
                    ) : (
                      <>
                        <CredentialCard account={newCredential} />
                        {accountsError && (
                          <div className="mb-4 rounded-xl bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 ring-1 ring-rose-200">{accountsError}</div>
                        )}

                        <h4 className="mb-3 text-lg font-black text-slate-900">Tài khoản gắn với hộ</h4>
                        {accountsLoading ? (
                          <div className="rounded-2xl bg-slate-50 px-4 py-6 text-center text-sm font-semibold text-slate-500 ring-1 ring-slate-200">Đang tải tài khoản…</div>
                        ) : accounts.length === 0 ? (
                          <div className="rounded-2xl bg-slate-50 px-4 py-6 text-center text-sm font-semibold text-slate-500 ring-1 ring-slate-200">Hộ này chưa có tài khoản nào.</div>
                        ) : (
                          <div className="overflow-hidden rounded-2xl border border-slate-200">
                            <table className="min-w-full divide-y divide-slate-200 text-sm">
                              <thead className="bg-slate-50 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
                                <tr>
                                  <th className="px-4 py-3">Tên đăng nhập</th><th className="px-4 py-3">Cư dân</th>
                                  <th className="px-4 py-3">Vai trò</th><th className="px-4 py-3">Trạng thái</th>
                                  <th className="px-4 py-3 text-right">Thao tác</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100">
                                {accounts.map((acc) => (
                                  <tr key={acc.id}>
                                    <td className="px-4 py-3 font-mono font-semibold text-slate-800">{acc.username}</td>
                                    <td className="px-4 py-3 text-slate-700">{acc.residentName || acc.fullName || "—"}</td>
                                    <td className="px-4 py-3"><Badge tone={acc.role === "ADMIN" ? "blue" : "green"}>{acc.role}</Badge></td>
                                    <td className="px-4 py-3"><Badge tone={acc.active ? "green" : "red"}>{acc.active ? "Hoạt động" : "Đã khóa"}</Badge></td>
                                    <td className="px-4 py-3 text-right">
                                      <button onClick={() => handleToggleLock(acc)}
                                        className={`inline-flex items-center gap-1 font-semibold ${acc.active ? "text-rose-600 hover:text-rose-800" : "text-emerald-600 hover:text-emerald-800"}`}>
                                        {acc.active ? <><Lock className="h-4 w-4" /> Khóa</> : <><Unlock className="h-4 w-4" /> Mở khóa</>}
                                      </button>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}

                        {/* Cư dân chưa có tài khoản -> cấp tài khoản */}
                        {residentsWithoutAccount.length > 0 && (
                          <div className="mt-5 rounded-2xl border border-slate-200 p-4">
                            <h5 className="mb-3 text-sm font-bold text-slate-700">Cư dân chưa có tài khoản</h5>
                            <div className="space-y-2">
                              {residentsWithoutAccount.map((m) => (
                                <div key={m.id} className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-2.5">
                                  <span className="text-sm font-semibold text-slate-800">{m.fullName}</span>
                                  <Button variant="soft" disabled={grantingId === m.id} onClick={() => handleGrantAccess(m)}>
                                    <KeyRound className="h-4 w-4" /> {grantingId === m.id ? "Đang cấp…" : "Cấp tài khoản"}
                                  </Button>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}
              </>
            )}

            <div className="mt-6 flex justify-end">
              <Button variant="secondary" onClick={closeDetail}>Đóng</Button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Modal thêm thành viên */}
      {showMemberForm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
          <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-3xl bg-white p-6 shadow-xl">
            <h3 className="mb-4 text-lg font-bold">Thêm thành viên vào hộ {household?.code}</h3>
            <div className="space-y-4">
              <Input label="Họ tên" placeholder="Nguyễn Văn A" value={memberForm.fullName}
                onChange={(e) => setMemberForm({ ...memberForm, fullName: e.target.value })} />
              <Input label="CCCD/CMND" placeholder="9 hoặc 12 chữ số" value={memberForm.idCard}
                onChange={(e) => setMemberForm({ ...memberForm, idCard: e.target.value })} />
              <Input label="Ngày sinh" type="date" value={memberForm.dateOfBirth}
                onChange={(e) => setMemberForm({ ...memberForm, dateOfBirth: e.target.value })} />
              <Select label="Giới tính" value={memberForm.gender} onChange={(e) => setMemberForm({ ...memberForm, gender: e.target.value })}>
                <option value="MALE">Nam</option><option value="FEMALE">Nữ</option><option value="OTHER">Khác</option>
              </Select>
              <Input label="Quan hệ với chủ hộ" placeholder="Vợ, Con, ..." value={memberForm.relationToHead}
                onChange={(e) => setMemberForm({ ...memberForm, relationToHead: e.target.value })} />
              <Select label="Cư trú" value={memberForm.residencyStatus} onChange={(e) => setMemberForm({ ...memberForm, residencyStatus: e.target.value })}>
                <option value="PERMANENT">Thường trú</option><option value="TEMPORARY">Tạm trú</option>
              </Select>
              {memberError && <div className="rounded-xl bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 ring-1 ring-rose-200">{memberError}</div>}
              <div className="flex justify-end gap-3 pt-2">
                <Button variant="secondary" onClick={() => setShowMemberForm(false)} disabled={savingMember}>Hủy</Button>
                <Button onClick={handleAddMember} disabled={savingMember}>{savingMember ? "Đang lưu…" : "Thêm thành viên"}</Button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Xác nhận chuyển 1 thành viên đi */}
      {memberMoveOut && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
          <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-xl">
            <h3 className="mb-3 text-lg font-black text-slate-900">Chuyển nhân khẩu đi</h3>
            <p className="mb-5 text-sm text-slate-600">
              Chuyển <strong>{memberMoveOut.fullName}</strong> ra khỏi hộ? Nhân khẩu sẽ chuyển sang trạng thái "Đã chuyển đi".
            </p>
            <div className="flex justify-end gap-3">
              <Button variant="secondary" onClick={() => setMemberMoveOut(null)} disabled={savingMember}>Hủy</Button>
              <Button variant="danger" onClick={handleMemberMoveOut} disabled={savingMember}>{savingMember ? "Đang chuyển…" : "Chuyển đi"}</Button>
            </div>
          </motion.div>
        </div>
      )}
    </>
  );
}

function Info({ label, value }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
      <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-lg font-black text-slate-900">{value ?? "—"}</p>
    </div>
  );
}
