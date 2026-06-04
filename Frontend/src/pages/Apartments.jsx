import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Search } from "lucide-react";
import { Button, Input, Select, StatusBadge } from "../components/common";
import { SectionHeader } from "../components/layout/SectionHeader";
import { listApartmentsAPI, searchApartmentsAPI, getApartmentDetailAPI } from "../api/apartmentApi";

const PAGE_SIZE = 20;

// Map nhãn tầng/trạng thái trên UI -> giá trị backend
const STATUS_MAP = { "Đang ở": "OCCUPIED", "Đang trống": "AVAILABLE" };

const yearOf = (dateStr) => (dateStr ? String(dateStr).slice(0, 4) : "—");

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

  const [filters, setFilters] = useState({
    code: "",
    floor: "Tất cả tầng",
    status: "Tất cả",
    owner: "",
  });
  // Bộ lọc đang áp dụng (để giữ khi chuyển trang)
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
    if (filters.status !== "Tất cả" && STATUS_MAP[filters.status]) {
      applied.status = STATUS_MAP[filters.status];
    }
    if (filters.owner.trim()) applied.headName = filters.owner.trim();

    setAppliedFilters(applied);
    loadPage(0, applied);
  };

  const handleReset = () => {
    setFilters({ code: "", floor: "Tất cả tầng", status: "Tất cả", owner: "" });
    setAppliedFilters(null);
    loadPage(0, null);
  };

  const openDetail = async (apartment) => {
    setSelectedApartment(apartment);
    setDetail(null);
    setDetailError("");
    setDetailLoading(true);
    const res = await getApartmentDetailAPI(apartment.id);
    if (res.success && res.data) {
      setDetail(res.data);
    } else {
      setDetailError(res.message || "Không tải được chi tiết căn hộ.");
    }
    setDetailLoading(false);
  };

  const closeDetail = () => {
    setSelectedApartment(null);
    setDetail(null);
    setDetailError("");
  };

  const household = detail?.currentHousehold || null;
  const members = household?.residents || [];

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
                <tr>
                  <td colSpan={7} className="px-5 py-10 text-center text-sm font-semibold text-slate-500">Đang tải dữ liệu…</td>
                </tr>
              ) : apartments.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-10 text-center text-sm font-semibold text-slate-500">Không có căn hộ phù hợp.</td>
                </tr>
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
                      <button onClick={() => openDetail(apartment)} className="font-semibold text-sky-700 hover:text-sky-900">
                        Chi tiết
                      </button>
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
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <h3 className="text-xl font-black text-slate-900">Chi tiết căn hộ {selectedApartment.code}</h3>
                <p className="mt-1 text-sm text-slate-500">
                  Tầng {selectedApartment.floor} • {selectedApartment.area} m² • Chủ hộ: {household?.headOfHousehold?.fullName || selectedApartment.headOfHouseholdName || "—"}
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

            {/* Thông tin hộ gia đình đang ở trong căn hộ */}
            {household && (
              <div className="mb-5 grid gap-4 md:grid-cols-3">
                <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Mã hộ khẩu</p>
                  <p className="mt-1 text-lg font-black text-slate-900">{household.code}</p>
                </div>
                <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Ngày chuyển đến</p>
                  <p className="mt-1 text-lg font-black text-slate-900">{household.moveInDate || "—"}</p>
                </div>
                <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Số nhân khẩu</p>
                  <p className="mt-1 text-lg font-black text-slate-900">{members.length}</p>
                </div>
              </div>
            )}

            <h4 className="mb-3 text-lg font-black text-slate-900">Thành viên trong căn hộ</h4>
            {detailLoading ? (
              <div className="rounded-2xl bg-slate-50 px-4 py-6 text-center text-sm font-semibold text-slate-500 ring-1 ring-slate-200">
                Đang tải thông tin hộ gia đình…
              </div>
            ) : detailError ? (
              <div className="rounded-2xl bg-rose-50 px-4 py-6 text-center text-sm font-semibold text-rose-700 ring-1 ring-rose-200">
                {detailError}
              </div>
            ) : !household || members.length === 0 ? (
              <div className="rounded-2xl bg-slate-50 px-4 py-6 text-center text-sm font-semibold text-slate-500 ring-1 ring-slate-200">
                Căn hộ này chưa có hộ dân đang cư trú.
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
                      <th className="px-4 py-3">Cư trú</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {members.map((member) => (
                      <tr key={member.id}>
                        <td className="px-4 py-3 font-semibold text-slate-800">{member.fullName}</td>
                        <td className="px-4 py-3 text-slate-700">{yearOf(member.dateOfBirth)}</td>
                        <td className="px-4 py-3 text-slate-700">{member.idCard || "—"}</td>
                        <td className="px-4 py-3 text-slate-700">{member.relationToHead || "—"}</td>
                        <td className="px-4 py-3"><StatusBadge status={member.residencyStatus} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="mt-5 flex justify-end">
              <Button variant="secondary" onClick={closeDetail}>Đóng</Button>
            </div>
          </motion.div>
        </div>
      )}
    </>
  );
}
