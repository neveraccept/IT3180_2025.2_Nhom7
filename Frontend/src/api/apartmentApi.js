// ============================================================
//  apartmentApi — Module 2: Quản lý căn hộ
//  Map trực tiếp ApartmentController (/api/apartments) của backend.
//  Tất cả endpoint yêu cầu quyền ADMIN (JWT đã gắn sẵn qua axiosClient).
//  Phân trang: PageResponse<T> = { items, totalElements, totalPages, page(0-based), size }
// ============================================================
import axiosClient, { callApi } from "./axiosClient";

// GET /api/apartments?page=&size=&sort= -> danh sách căn hộ (phân trang)
// sort dạng "code,asc" theo chuẩn Spring Pageable.
export const listApartmentsAPI = ({ page = 0, size = 20, sort = "code,asc" } = {}) =>
  callApi(axiosClient.get("/api/apartments", { params: { page, size, sort } }));

// GET /api/apartments/search?code=&floor=&status=&headName=&page=&size=
// Bỏ qua các tham số rỗng để backend không lọc nhầm.
export const searchApartmentsAPI = ({
  code,
  floor,
  status,
  headName,
  page = 0,
  size = 20,
  sort = "code,asc",
} = {}) => {
  const params = { page, size, sort };
  if (code) params.code = code;
  if (floor !== undefined && floor !== null && floor !== "") params.floor = floor;
  if (status) params.status = status;
  if (headName) params.headName = headName;
  return callApi(axiosClient.get("/api/apartments/search", { params }));
};

// GET /api/apartments/{id} -> ApartmentDetailDTO (kèm hộ dân đang ở)
export const getApartmentDetailAPI = (id) =>
  callApi(axiosClient.get(`/api/apartments/${id}`));

// Tra cứu hộ dân ACTIVE theo MÃ CĂN HỘ (vd: A12-01) — dùng cho các trang lọc theo hộ.
export const resolveHouseholdByApartmentCodeAPI = async (code) => {
  const trimmed = String(code ?? "").trim();
  if (!trimmed) return { success: false, message: "Vui lòng nhập mã căn hộ" };

  const searchRes = await searchApartmentsAPI({ code: trimmed, size: 5 });
  if (!searchRes.success || !searchRes.data?.items?.length) {
    return { success: false, message: "Không tìm thấy căn hộ với mã này" };
  }

  const apt = searchRes.data.items[0];
  const detailRes = await getApartmentDetailAPI(apt.id);
  if (!detailRes.success || !detailRes.data?.currentHousehold) {
    return { success: false, message: "Căn hộ này hiện không có hộ đang ở" };
  }

  const hh = detailRes.data.currentHousehold;
  return { success: true, householdId: hh.id, householdCode: hh.code, aptCode: apt.code };
};

// PUT /api/apartments/{id} -> cập nhật { floor, area, status, note }
export const updateApartmentAPI = (id, payload) =>
  callApi(axiosClient.put(`/api/apartments/${id}`, payload));
