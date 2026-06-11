// ============================================================
//  complaintApi — Module 8: Khiếu nại (Complaint)
//  Map ComplaintController (/api/complaints) của backend.
//    RESIDENT  POST   /api/complaints                        body { title, category, content }
//    RESIDENT  GET    /api/complaints/my                     phân trang
//    ADMIN     GET    /api/complaints?status=&category=      phân trang
//    ADMIN|RESIDENT GET /api/complaints/{id}
//    ADMIN     PUT    /api/complaints/{id}/response          body { response, status }
//  Enum backend:
//    ComplaintCategory = FEE | SECURITY | CLEANING | OTHER
//    ComplaintStatus   = NEW | IN_PROGRESS | RESOLVED | REJECTED
//  ComplaintDTO = { id, title, category, content, status, response,
//    senderName, householdCode, handledByName, createdAt, respondedAt }
// ============================================================
import axiosClient, { callApi } from "./axiosClient";

export const COMPLAINT_CATEGORY = {
  FEE: "FEE",
  SECURITY: "SECURITY",
  CLEANING: "CLEANING",
  OTHER: "OTHER",
};

export const COMPLAINT_STATUS = {
  NEW: "NEW",
  IN_PROGRESS: "IN_PROGRESS",
  RESOLVED: "RESOLVED",
  REJECTED: "REJECTED",
};

export const CATEGORY_LABEL = {
  FEE: "Phí",
  SECURITY: "An ninh",
  CLEANING: "Vệ sinh",
  OTHER: "Khác",
};

export const STATUS_LABEL = {
  NEW: "Mới gửi",
  IN_PROGRESS: "Đang xử lý",
  RESOLVED: "Đã giải quyết",
  REJECTED: "Từ chối",
};

// RESIDENT: gửi khiếu nại. payload = { title, category, content }
export const createComplaintAPI = (payload) =>
  callApi(axiosClient.post("/api/complaints", payload));

// RESIDENT: lấy khiếu nại của mình (phân trang)
export const listMyComplaintsAPI = ({ page = 0, size = 50, sort = "createdAt,desc" } = {}) =>
  callApi(axiosClient.get("/api/complaints/my", { params: { page, size, sort } }));

// ADMIN: lấy tất cả khiếu nại (lọc tùy chọn theo status / category)
export const listAllComplaintsAPI = ({
  status,
  category,
  page = 0,
  size = 50,
  sort = "createdAt,desc",
} = {}) => {
  const params = { page, size, sort };
  if (status) params.status = status;
  if (category) params.category = category;
  return callApi(axiosClient.get("/api/complaints", { params }));
};

// ADMIN | RESIDENT: chi tiết một khiếu nại (kiểm tra quyền ở Service)
export const getComplaintDetailAPI = (id) =>
  callApi(axiosClient.get(`/api/complaints/${id}`));

// ADMIN: phản hồi + cập nhật trạng thái. payload = { response, status }
// status chỉ được là IN_PROGRESS | RESOLVED | REJECTED (validate ở BE)
export const respondComplaintAPI = (id, payload) =>
  callApi(axiosClient.put(`/api/complaints/${id}/response`, payload));
