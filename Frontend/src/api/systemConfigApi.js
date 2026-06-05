// ============================================================
//  systemConfigApi — Cấu hình đơn giá gốc của hệ thống
//  Map SystemConfigController (/api/system-configs) — ADMIN only.
//  SystemConfigDTO = { id, configKey, configValue, description }
//  Các key: ELECTRICITY_UNIT_PRICE, WATER_UNIT_PRICE, INTERNET_PRICE
// ============================================================
import axiosClient, { callApi } from "./axiosClient";

export const CONFIG_KEYS = {
  ELECTRICITY_UNIT_PRICE: "ELECTRICITY_UNIT_PRICE",
  WATER_UNIT_PRICE: "WATER_UNIT_PRICE",
  INTERNET_PRICE: "INTERNET_PRICE",
};

// GET /api/system-configs -> danh sách đơn giá hệ thống
export const listSystemConfigsAPI = () =>
  callApi(axiosClient.get("/api/system-configs"));

// PUT /api/system-configs/{key} -> cập nhật giá trị đơn giá { value }
export const updateSystemConfigAPI = (key, value) =>
  callApi(axiosClient.put(`/api/system-configs/${key}`, { value }));
