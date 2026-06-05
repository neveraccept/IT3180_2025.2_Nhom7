// ============================================================
//  notificationApi — Module 9: Thông báo (Notification)
//  Map NotificationController (/api/notifications) của backend.
//    ADMIN        POST   /api/notifications              body NotificationCreateRequest
//    ADMIN|RESIDENT GET  /api/notifications/my           phân trang
//    ADMIN|RESIDENT PUT  /api/notifications/{id}/read
//  Enum backend: NotificationScope = ALL | BY_FLOOR | BY_HOUSEHOLD
//  NotificationDTO = { id, title, content, scope, senderName, sentAt,
//    isRead, readAt, recipientCount }
//  Ghi chú:
//    - scope=BY_FLOOR  -> payload cần thêm floors: number[]    (VD: [5, 6])
//    - scope=BY_HOUSEHOLD -> payload cần thêm householdIds: number[]
// ============================================================
import axiosClient, { callApi } from "./axiosClient";

export const NOTIFICATION_SCOPE = {
  ALL: "ALL",
  BY_FLOOR: "BY_FLOOR",
  BY_HOUSEHOLD: "BY_HOUSEHOLD",
};

export const SCOPE_LABEL = {
  ALL: "Toàn chung cư",
  BY_FLOOR: "Theo tầng",
  BY_HOUSEHOLD: "Theo hộ",
};

// ADMIN: tạo và gửi thông báo.
// payload = { title, content, scope, floors?: number[], householdIds?: number[] }
export const createNotificationAPI = (payload) =>
  callApi(axiosClient.post("/api/notifications", payload));

// ADMIN | RESIDENT: danh sách thông báo gửi cho user hiện tại (phân trang).
export const listMyNotificationsAPI = ({ page = 0, size = 50, sort = "id,desc" } = {}) =>
  callApi(axiosClient.get("/api/notifications/my", { params: { page, size, sort } }));

// ADMIN | RESIDENT: đánh dấu một thông báo đã đọc.
export const markNotificationReadAPI = (id) =>
  callApi(axiosClient.put(`/api/notifications/${id}/read`));
