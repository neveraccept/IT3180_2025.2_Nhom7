// ============================================================
//  vehicleApi — Module 6: Phương tiện (Vehicle) + Chỗ gửi xe (Parking)
//  Map VehicleController (/api/vehicles) & ParkingController (/api).
//  Phương tiện:
//    ADMIN     POST   /api/vehicles                         body RegisterVehicleRequest
//    ADMIN     PUT    /api/vehicles/{id}                    body UpdateVehicleRequest
//    ADMIN     DELETE /api/vehicles/{id}                    (hủy đăng ký)
//    ADMIN     GET    /api/vehicles/household/{householdId}
//    RESIDENT  GET    /api/vehicles/my-household
//  Chỗ gửi xe:
//    ADMIN     GET    /api/parking-slots
//    ADMIN     GET    /api/parking-slots/summary            -> { total, used, rented, empty }
//    ADMIN     POST   /api/parking-registrations            body CreateParkingRegistrationRequest
//    ADMIN     PUT    /api/parking-registrations/{id}/end
//    RESIDENT  GET    /api/parking-registrations/my-household
//  Enum backend: VehicleType = MOTORBIKE | CAR.
//                ParkingSlotStatus = EMPTY | USED | RENTED.
//                ParkingRegistrationStatus = ACTIVE | ENDED.
//  VehicleDTO = { id, householdId, householdCode, licensePlate, type, registeredDate, active }
// ============================================================
import axiosClient, { callApi } from "./axiosClient";

export const VEHICLE_TYPE = { MOTORBIKE: "MOTORBIKE", CAR: "CAR" };

// ----------------------------- PHƯƠNG TIỆN ---------------------------------

// ADMIN: đăng ký xe cho hộ. payload = { householdId, licensePlate, type }
export const registerVehicleAPI = (payload) =>
  callApi(axiosClient.post("/api/vehicles", payload));

// ADMIN: cập nhật xe.
export const updateVehicleAPI = (id, payload) =>
  callApi(axiosClient.put(`/api/vehicles/${id}`, payload));

// ADMIN: hủy đăng ký xe.
export const cancelVehicleAPI = (id) => callApi(axiosClient.delete(`/api/vehicles/${id}`));

// ADMIN: tra cứu xe theo hộ.
export const listVehiclesByHouseholdAPI = (householdId, { page = 0, size = 100, sort = "registeredDate,desc" } = {}) =>
  callApi(axiosClient.get(`/api/vehicles/household/${householdId}`, { params: { page, size, sort } }));

// RESIDENT: xe của hộ mình.
export const listMyVehiclesAPI = ({ page = 0, size = 100, sort = "registeredDate,desc" } = {}) =>
  callApi(axiosClient.get("/api/vehicles/my-household", { params: { page, size, sort } }));

// ----------------------------- CHỖ GỬI XE ----------------------------------

// ADMIN: danh sách chỗ gửi.
export const listParkingSlotsAPI = ({ page = 0, size = 200, sort = "code,asc" } = {}) =>
  callApi(axiosClient.get("/api/parking-slots", { params: { page, size, sort } }));

// ADMIN: tình trạng chỗ gửi { total, used, rented, empty }.
export const getParkingSummaryAPI = () => callApi(axiosClient.get("/api/parking-slots/summary"));

// ADMIN: tạo lượt đăng ký/cho thuê chỗ gửi.
// payload = { slotId, vehicleId?, renterName?, renterPhone?, startDate?, endDate?, monthlyFee? }
export const createParkingRegistrationAPI = (payload) =>
  callApi(axiosClient.post("/api/parking-registrations", payload));

// ADMIN: kết thúc một lượt đăng ký.
export const endParkingRegistrationAPI = (id) =>
  callApi(axiosClient.put(`/api/parking-registrations/${id}/end`));

// RESIDENT: lượt gửi xe đang hiệu lực của hộ mình.
export const listMyParkingRegistrationsAPI = ({ page = 0, size = 100, sort = "startDate,desc" } = {}) =>
  callApi(axiosClient.get("/api/parking-registrations/my-household", { params: { page, size, sort } }));

// ----------------------------- HOÁ ĐƠN PHÍ GỬI XE --------------------------

// ADMIN: sinh hóa đơn phí gửi xe cho từng hộ theo tháng (gắn vào hệ thống Thu phí).
// payload = { month, year } -> { feePeriodId, feePeriodName, invoiceCount, totalAmount }
export const generateParkingFeesAPI = ({ month, year }) =>
  callApi(axiosClient.post("/api/admin/parking-fees/generate", { month: Number(month), year: Number(year) }));
