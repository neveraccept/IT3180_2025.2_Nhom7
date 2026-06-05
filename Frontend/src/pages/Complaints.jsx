import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Plus, RefreshCw } from "lucide-react";
import { Button, Card, Input, Select, StatusBadge } from "../components/common";
import { SectionHeader } from "../components/layout/SectionHeader";
import {
  createComplaintAPI,
  listMyComplaintsAPI,
  listAllComplaintsAPI,
  respondComplaintAPI,
  CATEGORY_LABEL,
} from "../api/complaintApi";

const formatDate = (iso) => {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("vi-VN");
};

export function Complaints({
  role,
  // các props mock data bên dưới được giữ để không break Layout, nhưng không dùng
  // eslint-disable-next-line no-unused-vars
  complaintsList,
  // eslint-disable-next-line no-unused-vars
  setComplaintsList,
  initialComplaintId,
  onInitialComplaintHandled,
}) {
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pageError, setPageError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Filter state (admin)
  const [filterStatus, setFilterStatus] = useState("");
  const [filterCategory, setFilterCategory] = useState("");

  // Detail modal
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  const [handlingContent, setHandlingContent] = useState("");
  const [handlingStatus, setHandlingStatus] = useState("IN_PROGRESS");
  const [detailError, setDetailError] = useState("");
  const [detailLoading, setDetailLoading] = useState(false);

  // Inline status update (admin table row)
  const [updatingStatusId, setUpdatingStatusId] = useState(null);

  // Create form
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newComplaint, setNewComplaint] = useState({ title: "", category: "FEE", content: "" });
  const [createError, setCreateError] = useState("");
  const [createLoading, setCreateLoading] = useState(false);

  const fetchComplaints = useCallback(async () => {
    setLoading(true);
    setPageError("");
    const res =
      role === "ADMIN"
        ? await listAllComplaintsAPI({
            status: filterStatus || undefined,
            category: filterCategory || undefined,
          })
        : await listMyComplaintsAPI();

    if (res.success && res.data) {
      setComplaints(res.data.items || []);
    } else {
      setPageError(res.message || "Không tải được danh sách khiếu nại.");
      setComplaints([]);
    }
    setLoading(false);
  }, [role, filterStatus, filterCategory]);

  useEffect(() => {
    fetchComplaints();
  }, [fetchComplaints]);

  // Mở chi tiết khiếu nại
  const openDetail = (complaint) => {
    setSelectedComplaint(complaint);
    setHandlingContent(complaint.response || "");
    setHandlingStatus(
      complaint.status === "NEW" || complaint.status === "IN_PROGRESS"
        ? "IN_PROGRESS"
        : complaint.status
    );
    setDetailError("");
    onInitialComplaintHandled?.();
  };

  const closeDetail = () => {
    setSelectedComplaint(null);
    setHandlingContent("");
    setHandlingStatus("IN_PROGRESS");
    setDetailError("");
  };

  // Admin: cập nhật trạng thái trực tiếp từ bảng danh sách (không cần mở chi tiết)
  const handleInlineStatusChange = async (complaint, newStatus) => {
    if (newStatus === complaint.status || updatingStatusId === complaint.id) return;
    setUpdatingStatusId(complaint.id);
    const res = await respondComplaintAPI(complaint.id, {
      response: complaint.response || "",
      status: newStatus,
    });
    setUpdatingStatusId(null);
    if (res.success) {
      setComplaints((prev) =>
        prev.map((c) => (c.id === complaint.id ? { ...c, status: newStatus } : c))
      );
      setSuccessMsg("Đã cập nhật trạng thái khiếu nại thành công");
      setTimeout(() => setSuccessMsg(""), 3500);
    } else {
      setPageError(res.message || "Cập nhật trạng thái thất bại. Vui lòng thử lại.");
      setTimeout(() => setPageError(""), 3500);
    }
  };

  // Admin: lưu phản hồi
  const handleSave = async () => {
    if (role !== "ADMIN") return;
    setDetailLoading(true);
    setDetailError("");
    const res = await respondComplaintAPI(selectedComplaint.id, {
      response: handlingContent.trim(),
      status: handlingStatus,
    });
    if (res.success) {
      closeDetail();
      await fetchComplaints();
      setSuccessMsg("Đã cập nhật xử lý khiếu nại thành công");
      setTimeout(() => setSuccessMsg(""), 3500);
    } else {
      setDetailError(res.message || "Không thể cập nhật khiếu nại. Vui lòng thử lại.");
    }
    setDetailLoading(false);
  };

  // Resident: gửi khiếu nại mới
  const handleCreateComplaint = async () => {
    if (!newComplaint.title.trim() || !newComplaint.content.trim()) {
      setCreateError("Vui lòng nhập tiêu đề và nội dung khiếu nại");
      return;
    }
    setCreateLoading(true);
    setCreateError("");
    const res = await createComplaintAPI({
      title: newComplaint.title.trim(),
      category: newComplaint.category,
      content: newComplaint.content.trim(),
    });
    if (res.success) {
      setNewComplaint({ title: "", category: "FEE", content: "" });
      setShowCreateForm(false);
      await fetchComplaints();
      setSuccessMsg("Đã gửi khiếu nại thành công");
      setTimeout(() => setSuccessMsg(""), 3500);
    } else {
      setCreateError(res.message || "Không thể gửi khiếu nại. Vui lòng thử lại.");
    }
    setCreateLoading(false);
  };

  return (
    <>
      <SectionHeader
        title={role === "ADMIN" ? "Xử lý khiếu nại" : "Khiếu nại của tôi"}
        desc={
          role === "ADMIN"
            ? "Admin xem nội dung khiếu nại, nhập nội dung xử lý và cập nhật trạng thái."
            : "Gửi khiếu nại mới hoặc xem tình trạng xử lý khiếu nại đã gửi."
        }
        action={
          role !== "ADMIN" ? (
            <Button onClick={() => setShowCreateForm(true)}>
              <Plus className="h-4 w-4" /> Gửi khiếu nại
            </Button>
          ) : null
        }
      />

      {/* Thông báo thành công */}
      {successMsg && (
        <div className="mb-4 rounded-xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700 ring-1 ring-emerald-200">
          {successMsg}
        </div>
      )}

      {/* Form gửi khiếu nại (Resident) */}
      {showCreateForm && role !== "ADMIN" && (
        <Card className="mb-5">
          <h3 className="mb-4 text-lg font-black">Gửi khiếu nại mới</h3>
          <div className="space-y-4">
            <Input
              label="Tiêu đề"
              value={newComplaint.title}
              onChange={(e) => setNewComplaint({ ...newComplaint, title: e.target.value })}
            />
            <Select
              label="Loại khiếu nại"
              value={newComplaint.category}
              onChange={(e) => setNewComplaint({ ...newComplaint, category: e.target.value })}
            >
              <option value="FEE">Phí</option>
              <option value="SECURITY">An ninh</option>
              <option value="CLEANING">Vệ sinh</option>
              <option value="OTHER">Khác</option>
            </Select>
            <label className="block">
              <span className="mb-1.5 block text-sm font-semibold text-slate-700">Nội dung</span>
              <textarea
                rows={4}
                value={newComplaint.content}
                onChange={(e) => setNewComplaint({ ...newComplaint, content: e.target.value })}
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
              />
            </label>
            {createError && (
              <div className="rounded-xl bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 ring-1 ring-rose-200">
                {createError}
              </div>
            )}
            <div className="flex justify-end gap-3">
              <Button
                variant="secondary"
                onClick={() => {
                  setShowCreateForm(false);
                  setCreateError("");
                }}
              >
                Hủy
              </Button>
              <Button onClick={handleCreateComplaint} disabled={createLoading}>
                {createLoading ? "Đang gửi..." : "Gửi khiếu nại"}
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Bộ lọc (Admin) */}
      {role === "ADMIN" && (
        <div className="mb-4 flex flex-wrap items-end gap-3">
          <div className="min-w-[160px]">
            <Select
              label="Lọc theo trạng thái"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="">Tất cả trạng thái</option>
              <option value="NEW">Mới gửi</option>
              <option value="IN_PROGRESS">Đang xử lý</option>
              <option value="RESOLVED">Đã giải quyết</option>
              <option value="REJECTED">Từ chối</option>
            </Select>
          </div>
          <div className="min-w-[160px]">
            <Select
              label="Lọc theo loại"
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
            >
              <option value="">Tất cả loại</option>
              <option value="FEE">Phí</option>
              <option value="SECURITY">An ninh</option>
              <option value="CLEANING">Vệ sinh</option>
              <option value="OTHER">Khác</option>
            </Select>
          </div>
          <Button variant="secondary" onClick={fetchComplaints} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            {loading ? "Đang tải..." : "Làm mới"}
          </Button>
        </div>
      )}

      {/* Lỗi tải */}
      {pageError && (
        <div className="mb-4 rounded-xl bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 ring-1 ring-rose-200">
          {pageError}
        </div>
      )}

      {/* Bảng danh sách */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-5 py-4">Mã</th>
                <th className="px-5 py-4">Tiêu đề</th>
                <th className="px-5 py-4">Người gửi</th>
                <th className="px-5 py-4">Loại</th>
                <th className="px-5 py-4">Ngày gửi</th>
                <th className="px-5 py-4">Trạng thái</th>
                <th className="px-5 py-4 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading && (
                <tr>
                  <td colSpan={7} className="px-5 py-10 text-center text-sm font-semibold text-slate-500">
                    Đang tải...
                  </td>
                </tr>
              )}
              {!loading && complaints.map((complaint) => (
                <tr key={complaint.id} className="hover:bg-slate-50/80">
                  <td className="px-5 py-4 text-slate-500">#{complaint.id}</td>
                  <td className="px-5 py-4 font-semibold text-slate-800">{complaint.title}</td>
                  <td className="px-5 py-4 text-slate-700">
                    {complaint.senderName || "—"}
                    {complaint.householdCode ? (
                      <span className="ml-1 text-xs text-slate-400">({complaint.householdCode})</span>
                    ) : null}
                  </td>
                  <td className="px-5 py-4 text-slate-700">
                    {CATEGORY_LABEL[complaint.category] || complaint.category}
                  </td>
                  <td className="px-5 py-4 text-slate-600">{formatDate(complaint.createdAt)}</td>
                  <td className="px-5 py-4">
                    {role === "ADMIN" ? (
                      <select
                        value={complaint.status}
                        disabled={updatingStatusId === complaint.id}
                        onChange={(e) => handleInlineStatusChange(complaint, e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                        className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs font-semibold text-slate-700 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <option value="NEW">Mới gửi</option>
                        <option value="IN_PROGRESS">Đang xử lý</option>
                        <option value="RESOLVED">Đã giải quyết</option>
                        <option value="REJECTED">Từ chối</option>
                      </select>
                    ) : (
                      <StatusBadge status={complaint.status} />
                    )}
                  </td>
                  <td className="px-5 py-4 text-right">
                    <button
                      onClick={() => openDetail(complaint)}
                      className="font-semibold text-sky-700 hover:text-sky-900"
                    >
                      Chi tiết
                    </button>
                  </td>
                </tr>
              ))}
              {!loading && complaints.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-5 py-10 text-center text-sm font-semibold text-slate-500">
                    {role === "ADMIN" ? "Chưa có khiếu nại nào." : "Bạn chưa gửi khiếu nại nào."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal chi tiết */}
      {selectedComplaint && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white p-6 shadow-xl"
          >
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <h3 className="text-xl font-black text-slate-900">Chi tiết khiếu nại</h3>
                <p className="mt-1 text-sm text-slate-500">
                  #{selectedComplaint.id} •{" "}
                  {selectedComplaint.senderName || "—"}
                  {selectedComplaint.householdCode
                    ? ` (${selectedComplaint.householdCode})`
                    : ""}
                </p>
              </div>
              <StatusBadge status={selectedComplaint.status} />
            </div>

            <div className="mb-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-700">
              <p>
                <strong>Tiêu đề:</strong> {selectedComplaint.title}
              </p>
              <p>
                <strong>Loại:</strong>{" "}
                {CATEGORY_LABEL[selectedComplaint.category] || selectedComplaint.category}
              </p>
              <p>
                <strong>Ngày gửi:</strong> {formatDate(selectedComplaint.createdAt)}
              </p>
              <p className="mt-2">
                <strong>Nội dung khiếu nại:</strong>
              </p>
              <p className="whitespace-pre-wrap">{selectedComplaint.content}</p>
            </div>

            {role === "ADMIN" ? (
              <div className="space-y-4">
                <label className="block">
                  <span className="mb-1.5 block text-sm font-semibold text-slate-700">
                    Nội dung xử lý
                  </span>
                  <textarea
                    rows={5}
                    value={handlingContent}
                    onChange={(e) => setHandlingContent(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
                    placeholder="Nhập nội dung phản hồi..."
                  />
                </label>
                <Select
                  label="Trạng thái xử lý"
                  value={handlingStatus}
                  onChange={(e) => setHandlingStatus(e.target.value)}
                >
                  <option value="IN_PROGRESS">Đang xử lý</option>
                  <option value="RESOLVED">Đã giải quyết</option>
                  <option value="REJECTED">Từ chối</option>
                </Select>
                {selectedComplaint.handledByName && (
                  <p className="text-xs text-slate-500">
                    Người xử lý: {selectedComplaint.handledByName}
                    {selectedComplaint.respondedAt
                      ? ` • ${formatDate(selectedComplaint.respondedAt)}`
                      : ""}
                  </p>
                )}
                {detailError && (
                  <div className="rounded-xl bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 ring-1 ring-rose-200">
                    {detailError}
                  </div>
                )}
                <div className="flex justify-end gap-3">
                  <Button variant="secondary" onClick={closeDetail}>
                    Hủy
                  </Button>
                  <Button onClick={handleSave} disabled={detailLoading}>
                    {detailLoading ? "Đang lưu..." : "Lưu"}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-700">
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                    Nội dung xử lý của Ban quản trị
                  </p>
                  <p className="mt-2">
                    {selectedComplaint.response || "Ban quản trị chưa cập nhật nội dung xử lý."}
                  </p>
                  {selectedComplaint.respondedAt && (
                    <p className="mt-1 text-xs text-slate-400">
                      Cập nhật: {formatDate(selectedComplaint.respondedAt)}
                    </p>
                  )}
                </div>
                <div className="flex justify-end">
                  <Button variant="secondary" onClick={closeDetail}>
                    Đóng
                  </Button>
                </div>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </>
  );
}
