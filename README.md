# 🏢 BlueMoon — Hệ thống Quản lý Chung cư

> Đồ án môn **Nhập môn Công nghệ phần mềm (IT3160)** — Học kỳ 2025.2 — Nhóm 7

Ứng dụng web quản lý toàn diện một khu chung cư: quản lý căn hộ, hộ gia đình, nhân khẩu,
các khoản thu phí, thanh toán (tiền mặt & VNPay), phương tiện, hoá đơn điện/nước, khiếu nại,
thông báo, thống kê — báo cáo và nhật ký thao tác của quản trị viên.

---

## 📑 Mục lục

- [Kiến trúc tổng quan](#-kiến-trúc-tổng-quan)
- [Công nghệ sử dụng](#-công-nghệ-sử-dụng)
- [Tính năng theo module](#-tính-năng-theo-module)
- [Yêu cầu môi trường](#-yêu-cầu-môi-trường)
- [Cài đặt & chạy](#-cài-đặt--chạy)
- [Tài khoản mẫu](#-tài-khoản-mẫu)
- [Cấu trúc thư mục](#-cấu-trúc-thư-mục)
- [Quy ước API](#-quy-ước-api)
- [Phân quyền](#-phân-quyền)
- [Thành viên nhóm](#-thành-viên-nhóm)

---

## 🏗 Kiến trúc tổng quan

Dự án gồm 2 phần tách biệt, giao tiếp qua REST API:

```
┌────────────────────────┐        REST / JSON         ┌────────────────────────┐
│   Frontend (React)     │ ─────────────────────────▶ │   Backend (Spring Boot) │
│   Vite · port 5173     │ ◀───────────────────────── │   port 9090 · /api      │
└────────────────────────┘     JWT Bearer Token        └───────────┬────────────┘
                                                                    │ JPA / Hibernate
                                                        ┌───────────▼────────────┐
                                                        │     MySQL (bluemoon)    │
                                                        └─────────────────────────┘
```

- **Backend** chạy ở cổng **9090**, mọi endpoint dưới base path `/api`.
- **Frontend** chạy ở cổng **5173** (Vite dev server), CORS đã được Backend cho phép.
- Xác thực bằng **JWT Bearer Token**; role trả về dạng `"ADMIN"` / `"RESIDENT"`.
- Thanh toán trực tuyến qua **VNPay** (sandbox) với cập nhật trạng thái qua IPN (server-to-server).

---

## 🛠 Công nghệ sử dụng

### Backend
- **Java 21** + **Spring Boot 4.0.5** (`spring-boot-starter-webmvc`)
- **Spring Security** + **JWT** (`jjwt` 0.12.5)
- **Spring Data JPA** / Hibernate + **MySQL 8**
- **Spring Mail** (gửi OTP qua email — Mailtrap sandbox)
- **AOP** (`aspectjweaver`) cho Audit Log thao tác Admin
- **Apache POI** (xuất Excel) + **OpenPDF** (xuất PDF)
- **Datafaker** (sinh dữ liệu mẫu locale `vi`)
- **Lombok**

### Frontend
- **React 19** + **Vite 8**
- **React Router DOM 7**
- **Axios** (HTTP client + interceptor gắn JWT)
- **Tailwind CSS v4**
- **Framer Motion** (hiệu ứng) · **Lucide React** (icon)

---

## ✨ Tính năng theo module

| # | Module | Tính năng chính |
|---|--------|-----------------|
| 1 | **Xác thực & Tài khoản** | Đăng nhập (JWT), đăng ký có xác thực OTP, quên/đổi mật khẩu, admin duyệt tài khoản |
| 2 | **Căn hộ & Hộ gia đình** | Quản lý căn hộ, bàn giao căn hộ, lập hộ, chuyển hộ, cấp/khóa tài khoản cư dân |
| 3 | **Nhân khẩu** | Thêm/sửa thành viên, chuyển đi (move-out), đăng ký tạm trú/thường trú |
| 4 | **Khoản thu** | CRUD khoản thu (theo m²/người/hộ/xe/cố định/đóng góp), tạo đợt thu → tự sinh phiếu thu |
| 5 | **Thanh toán** | Công nợ theo hộ, xác nhận tiền mặt (đơn lẻ & hàng loạt), thanh toán **VNPay** |
| 6 | **Gửi xe** | Quản lý phương tiện, chỗ gửi xe, lượt đăng ký, sinh hoá đơn phí gửi xe theo tháng |
| 7 | **Điện & Nước** | Hoá đơn điện/nước/internet (tính theo chỉ số cũ/mới × đơn giá hệ thống) |
| 8 | **Khiếu nại** | Cư dân gửi khiếu nại theo danh mục; admin tiếp nhận & phản hồi |
| 9 | **Thông báo** | Admin gửi thông báo theo phạm vi (tất cả / theo tầng / theo hộ); cư dân đánh dấu đã đọc |
| 10 | **Thống kê & Báo cáo** | Thống kê thu phí, công nợ, dân cư; xuất báo cáo **Excel / PDF** theo khoảng thời gian |
| 11 | **Xóa mềm & Audit Log** | Xóa mềm tài khoản; ghi nhật ký mọi thao tác thay đổi dữ liệu của Admin (AOP) |

---

## 📋 Yêu cầu môi trường

| Thành phần | Phiên bản |
|------------|-----------|
| JDK | **21** |
| Node.js | **≥ 20** |
| MySQL | **8.x** |
| Maven | Dùng wrapper kèm sẵn (`mvnw`) — không cần cài riêng |

---

## 🚀 Cài đặt & chạy

### 1. Chuẩn bị cơ sở dữ liệu

Tạo database MySQL tên `bluemoon`:

```sql
CREATE DATABASE bluemoon CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

> Cấu hình kết nối nằm ở [`Backend/src/main/resources/application.properties`](Backend/src/main/resources/application.properties).
> Chỉnh `spring.datasource.username` / `spring.datasource.password` cho khớp MySQL của bạn.
> Hibernate dùng `ddl-auto=update` nên bảng sẽ **tự tạo** khi khởi động lần đầu, đồng thời
> hệ thống **tự seed** dữ liệu mẫu (tài khoản admin, ~100 hộ dân, căn hộ, xe, hoá đơn, khiếu nại…).

### 2. Chạy Backend

```bash
cd Backend
./mvnw spring-boot:run          # Linux/macOS
# hoặc trên Windows:
.\mvnw.cmd spring-boot:run
```

Backend sẵn sàng tại **http://localhost:9090**.

### 3. Chạy Frontend

```bash
cd Frontend
npm install
npm run dev
```

Mở trình duyệt tại **http://localhost:5173**.

### 4. (Tuỳ chọn) Cấu hình thanh toán VNPay

Thanh toán online dùng VNPay **sandbox**. Vì VNPay cần gọi ngược về server (Return/IPN),
khi test local cần một URL công khai (ví dụ qua **ngrok**) và cập nhật `vnpay.return-url`
trong `application.properties`. `vnpay.frontend-return-url` đã trỏ về `http://localhost:5173/payment-result`.

---

## 🔑 Tài khoản mẫu

Khi khởi động, hệ thống tự seed tài khoản admin và ~100 tài khoản cư dân mẫu (phân bố ngẫu nhiên trong 100 căn hộ). Dưới đây là:

| Vai trò | Username | Mật khẩu | Ghi chú |
|---------|----------|----------|---------|
| Quản trị viên | `admin` | `admin123` | Toàn quyền |

---

## 📂 Cấu trúc thư mục

```
IT3160_2025.2_Nhom7/
├── Backend/                       # Spring Boot API
│   ├── src/main/java/org/example/backend/
│   │   ├── controller/            # 18 REST controllers (Auth, Apartment, Resident, Fee, Payment…)
│   │   ├── service/               # Tầng nghiệp vụ
│   │   ├── repository/            # Spring Data JPA
│   │   ├── entity/                # Các entity (User, Apartment, Household, Resident, Payment…)
│   │   ├── dto/                   # DTO request/response
│   │   ├── security/              # JWT filter, CustomUserDetailsService, cấu hình bảo mật
│   │   ├── aspect/                # @LogAdminAction + AuditAspect (Audit Log)
│   │   └── config/                # Seed dữ liệu, cấu hình khác
│   ├── src/main/resources/application.properties
│   └── pom.xml
│
└── Frontend/                      # React + Vite
    └── src/
        ├── api/                   # axiosClient + các module API (authApi, feeApi, paymentApi…)
        ├── context/               # AuthContext, AppContext
        ├── routes/                # AppRoutes, ProtectedRoute (RBAC), AppShell
        ├── components/            # common, layout, auth
        ├── pages/                 # Các trang (Login, Apartments, Fees, Payments, Statistics…)
        ├── hooks/ · utils/ · data/
        └── App.jsx
```

---

## 🔌 Quy ước API

- **Base path:** `http://localhost:9090/api`
- **Định dạng response chuẩn** — bọc trong `ApiResponse<T>`:

  ```json
  { "success": true, "data": { ... }, "message": "...", "errorCode": null }
  ```

  *(Riêng một số endpoint OTP trả Map `{message}` / `{error}`.)*

- **Xác thực:** gắn header `Authorization: Bearer <token>` (Frontend tự đính kèm qua axios interceptor).
- **Mã lỗi thường gặp:**
  - `400 VALIDATION_FAILED` — `@Valid` thất bại
  - `400 MALFORMED_REQUEST` — JSON / enum sai hoặc có trường lạ
  - `401 / 403` — chưa đăng nhập / không đủ quyền
  - `404` — không tìm thấy bản ghi
- **Phân trang** trả về `PageResponse<T>` (`items`, `totalElements`, `totalPages`…).

---

## 🔐 Phân quyền

| Vai trò | Quyền hạn |
|---------|-----------|
| **ADMIN** | Quản lý toàn bộ: căn hộ, hộ, nhân khẩu, khoản thu, thu phí, xe, hoá đơn, duyệt tài khoản, thống kê, báo cáo, xem nhật ký |
| **RESIDENT** | Xem công nợ của hộ mình, thanh toán VNPay, xem hoá đơn điện/nước/xe, gửi khiếu nại, nhận thông báo, đổi mật khẩu/thông tin cá nhân |

Phân quyền được kiểm soát ở **2 tầng**: `SecurityFilterChain` (theo URL) và `@PreAuthorize` (theo method).

---

## 👥 Thành viên nhóm

> Nhóm 7 — IT3160 (HK 2025.2)

| Họ và tên | Vai trò |
|-----------|---------|
| Điện Bảo Khanh | Nhóm trưởng |
| Nguyễn Hồng Kiên | Backend |
| Lê Quang Hưng | Backend |
| Bùi Viết Mạnh | Frontend |
| Trần Quốc Cường | Frontend |

---

<p align="center">
  <i>Đồ án môn Nhập môn Công nghệ phần mềm — Đại học Bách khoa Hà Nội</i>
</p>
```
