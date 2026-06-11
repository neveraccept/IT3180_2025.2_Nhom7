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

// PUT /api/apartments/{id} -> cập nhật { floor, area, status, note }
export const updateApartmentAPI = (id, payload) =>
  callApi(axiosClient.put(`/api/apartments/${id}`, payload));
