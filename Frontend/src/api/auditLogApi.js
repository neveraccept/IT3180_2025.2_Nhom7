// ============================================================
//  auditLogApi — Nhật ký thao tác Admin (AuditLogController)
//  Map /api/admin/audit-logs (chỉ ADMIN).
// ============================================================
import axiosClient, { callApi } from "./axiosClient";

// GET /api/admin/audit-logs?page=&size= -> PageResponse<AuditLogDTO> (mới nhất lên đầu)
export const getAuditLogsAPI = ({ page = 0, size = 20 } = {}) =>
  callApi(axiosClient.get("/api/admin/audit-logs", { params: { page, size } }));
