import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Building2, Users, WalletCards, Bell, MessageSquareWarning, CheckCircle2 } from "lucide-react";
import { money } from "../utils/helpers";
import { Badge, Button, Card, StatusBadge } from "../components/common";
import { SectionHeader } from "../components/layout/SectionHeader";
import { getResidentStatisticsAPI } from "../api/reportApi";
import { listFeePeriodsAPI } from "../api/feeApi";
import { listAllComplaintsAPI, CATEGORY_LABEL } from "../api/complaintApi";
import { listMyNotificationsAPI, listSentNotificationsAPI } from "../api/notificationApi";
import { listMyHouseholdPaymentsAPI } from "../api/paymentApi";
import { listMyUtilityBillsAPI } from "../api/utilityApi";

const formatDate = (iso) => (iso ? new Date(iso).toLocaleDateString("vi-VN") : "");

export function Dashboard({ role }) {
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState([]);
  const [selectedNotification, setSelectedNotification] = useState(null);

  // Admin state
  const [stats, setStats] = useState(null);
  const [openPeriodsCount, setOpenPeriodsCount] = useState(0);
  const [unresolvedComplaints, setUnresolvedComplaints] = useState([]);
  const [selectedComplaint, setSelectedComplaint] = useState(null);

  // Resident state
  const [unpaidItems, setUnpaidItems] = useState([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);

      if (role === "ADMIN") {
        // Admin: thông báo đã gửi + thống kê + đợt thu + khiếu nại chưa xử lý
        const [notifRes, statsRes, periodsRes, complaintsRes] = await Promise.all([
          listSentNotificationsAPI(),
          getResidentStatisticsAPI(),
          listFeePeriodsAPI(),
          // Lấy toàn bộ rồi lọc các khiếu nại chưa xử lý (NEW + IN_PROGRESS) phía client,
          // vì API chỉ lọc được 1 trạng thái mỗi lần gọi.
          listAllComplaintsAPI({ size: 200 }),
        ]);
        if (!cancelled) {
          if (notifRes.success) setNotifications(notifRes.data?.items || []);
          if (statsRes.success) setStats(statsRes.data);
          if (periodsRes.success) {
            const items = periodsRes.data?.items || [];
            setOpenPeriodsCount(items.filter((p) => p.status === "OPEN").length);
          }
          if (complaintsRes.success) {
            const pending = (complaintsRes.data?.items || []).filter(
              (c) => c.status === "NEW" || c.status === "IN_PROGRESS"
            );
            setUnresolvedComplaints(pending);
          }
        }
      } else {
        const notifRes = await listMyNotificationsAPI();
        if (!cancelled && notifRes.success) setNotifications(notifRes.data?.items || []);

        const [paymentsRes, billsRes] = await Promise.all([
          listMyHouseholdPaymentsAPI(),
          listMyUtilityBillsAPI(),
        ]);
        if (!cancelled) {
          const fees = (paymentsRes.data?.items || []).filter((p) => p.status === "PENDING");
          const bills = (billsRes.data?.items || []).filter((b) => b.status === "UNPAID");
          setUnpaidItems([
            ...fees.map((p) => ({
              id: `FEE-${p.id}`,
              name: p.feeName || p.feePeriodName || "Khoản phí",
              period: p.feePeriodName || "",
              amount: Number(p.amountDue || 0),
            })),
            ...bills.map((b) => ({
              id: `BILL-${b.id}`,
              name: `Hóa đơn ${b.type === "ELECTRICITY" ? "Điện" : b.type === "WATER" ? "Nước" : "Internet"}`,
              period: `Tháng ${b.month}/${b.year}`,
              amount: Number(b.amount || 0),
            })),
          ]);
        }
      }

      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [role]);

  const unreadCount = notifications.filter((n) => !n.isRead).length;
  const unpaidTotal = unpaidItems.reduce((s, r) => s + r.amount, 0);

  const closeModals = () => {
    setSelectedComplaint(null);
    setSelectedNotification(null);
  };

  if (role !== "ADMIN") {
    return (
      <>
        <SectionHeader title="Dashboard cư dân" desc="Các khoản phí chưa nộp và thông báo mới nhất của hộ cư dân." />

        <div className="mb-6 grid gap-4 md:grid-cols-2">
          <Card>
            <p className="text-sm font-semibold text-slate-500">Tổng chưa nộp</p>
            <p className="mt-2 text-3xl font-black text-rose-700">{loading ? "..." : money(unpaidTotal)}</p>
            <p className="mt-1 text-xs text-slate-500">
              {loading ? "" : `${unpaidItems.length} khoản/hóa đơn cần thanh toán`}
            </p>
          </Card>
          <Card>
            <p className="text-sm font-semibold text-slate-500">Thông báo chưa đọc</p>
            <p className="mt-2 text-3xl font-black text-sky-700">{loading ? "..." : unreadCount}</p>
            <p className="mt-1 text-xs text-slate-500">Từ Ban quản trị</p>
          </Card>
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <Card>
            <h3 className="mb-4 text-lg font-black">Các khoản phí chưa nộp</h3>
            <div className="space-y-3">
              {loading && <p className="text-sm text-slate-500">Đang tải...</p>}
              {!loading && unpaidItems.length === 0 && (
                <div className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700 ring-1 ring-emerald-200">
                  ✓ Hộ của bạn không còn khoản phí chưa nộp.
                </div>
              )}
              {!loading &&
                unpaidItems.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-start justify-between gap-4 rounded-2xl border border-slate-200 p-4"
                  >
                    <div>
                      <p className="font-black text-slate-900">{item.name}</p>
                      {item.period && <p className="mt-1 text-sm text-slate-500">{item.period}</p>}
                      <p className="mt-2 text-sm font-semibold text-rose-700">
                        Cần nộp: {money(item.amount)}
                      </p>
                    </div>
                    <Badge tone="red">Chưa nộp</Badge>
                  </div>
                ))}
            </div>
          </Card>

          <Card>
            <h3 className="mb-4 text-lg font-black">Thông báo</h3>
            <div className="space-y-3">
              {loading && <p className="text-sm text-slate-500">Đang tải...</p>}
              {!loading && notifications.length === 0 && (
                <p className="text-sm text-slate-500">Chưa có thông báo.</p>
              )}
              {!loading &&
                notifications.slice(0, 5).map((n) => (
                  <button
                    key={n.id}
                    onClick={() => setSelectedNotification(n)}
                    className="flex w-full gap-3 rounded-2xl bg-slate-50 p-4 text-left transition hover:bg-slate-100"
                  >
                    {n.isRead ? (
                      <CheckCircle2 className="mt-1 h-5 w-5 text-emerald-600" />
                    ) : (
                      <Bell className="mt-1 h-5 w-5 text-sky-600" />
                    )}
                    <div className="min-w-0">
                      <p className="font-bold text-slate-800">{n.title}</p>
                      <p className="text-sm text-slate-500">{formatDate(n.sentAt)}</p>
                    </div>
                  </button>
                ))}
            </div>
          </Card>
        </div>

        {selectedNotification && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
            onClick={closeModals}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              onClick={(e) => e.stopPropagation()}
              className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-3xl bg-white p-6 shadow-xl"
            >
              <h3 className="mb-2 text-xl font-black text-slate-900">{selectedNotification.title}</h3>
              <p className="mb-4 text-sm text-slate-500">{formatDate(selectedNotification.sentAt)}</p>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-700">
                {selectedNotification.content}
              </div>
              <div className="mt-5 flex justify-end">
                <Button variant="secondary" onClick={closeModals}>Đóng</Button>
              </div>
            </motion.div>
          </div>
        )}
      </>
    );
  }

  // ─── ADMIN VIEW ────────────────────────────────────────────────────────────
  const adminCards = [
    {
      label: "Hộ đang hoạt động",
      value: loading ? "..." : String(stats?.totalActiveHouseholds ?? "—"),
      icon: Building2,
      tone: "text-sky-700",
      sub: loading ? "" : `${stats?.permanentCount ?? 0} thường trú`,
    },
    {
      label: "Nhân khẩu",
      value: loading ? "..." : String(stats?.totalActiveResidents ?? "—"),
      icon: Users,
      tone: "text-emerald-700",
      sub: loading ? "" : `${stats?.temporaryCount ?? 0} tạm trú, ${stats?.absentCount ?? 0} tạm vắng`,
    },
    {
      label: "Đợt thu đang mở",
      value: loading ? "..." : String(openPeriodsCount),
      icon: WalletCards,
      tone: "text-violet-700",
      sub: "Đợt thu phí đang hoạt động",
    },
    {
      label: "Khiếu nại chưa xử lý",
      value: loading ? "..." : String(unresolvedComplaints.length),
      icon: MessageSquareWarning,
      tone: "text-rose-700",
      sub: "Chờ xử lý & đang xử lý",
    },
  ];

  return (
    <>
      <SectionHeader
        title="Dashboard"
        desc="Tổng quan vận hành và thu phí của chung cư BlueMoon."
      />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {adminCards.map((card) => {
          const Icon = card.icon;
          return (
            <Card key={card.label}>
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-500">{card.label}</p>
                  <p className="mt-2 text-3xl font-black text-slate-950">{card.value}</p>
                  <p className="mt-1 text-xs text-slate-500">{card.sub}</p>
                </div>
                <div className={`rounded-2xl bg-slate-50 p-3 ${card.tone}`}>
                  <Icon className="h-6 w-6" />
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <Card>
          <h3 className="mb-4 text-lg font-black">Khiếu nại chưa xử lý</h3>
          <div className="space-y-3">
            {loading && <p className="text-sm text-slate-500">Đang tải...</p>}
            {!loading && unresolvedComplaints.length === 0 && (
              <div className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                ✓ Không có khiếu nại chưa xử lý
              </div>
            )}
            {!loading &&
              unresolvedComplaints.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setSelectedComplaint(c)}
                  className="flex w-full gap-3 rounded-2xl border border-slate-200 p-4 text-left transition hover:bg-slate-50"
                >
                  <MessageSquareWarning className="mt-1 h-5 w-5 flex-shrink-0 text-amber-600" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-bold text-slate-900">{c.title}</p>
                        <p className="text-sm text-slate-500">
                          #{c.id} • {c.senderName || "—"}
                          {c.householdCode ? ` (${c.householdCode})` : ""}
                        </p>
                      </div>
                      <StatusBadge status={c.status} />
                    </div>
                    <p className="mt-2 text-xs font-medium text-slate-600">
                      Danh mục: {CATEGORY_LABEL[c.category] || c.category}
                    </p>
                  </div>
                </button>
              ))}
          </div>
        </Card>

        <Card>
          <h3 className="mb-4 text-lg font-black">Thông báo gần đây</h3>
          <div className="space-y-3">
            {loading && <p className="text-sm text-slate-500">Đang tải...</p>}
            {!loading && notifications.length === 0 && (
              <p className="text-sm text-slate-500">Chưa có thông báo.</p>
            )}
            {!loading &&
              notifications.slice(0, 5).map((n) => (
                <button
                  key={n.id}
                  onClick={() => setSelectedNotification(n)}
                  className="flex w-full gap-3 rounded-2xl bg-slate-50 p-4 text-left transition hover:bg-slate-100"
                >
                  <Bell className="mt-1 h-5 w-5 text-sky-600" />
                  <div className="min-w-0">
                    <p className="font-bold text-slate-800">{n.title}</p>
                    <p className="text-sm text-slate-500">{formatDate(n.sentAt)}</p>
                  </div>
                </button>
              ))}
          </div>
        </Card>
      </div>

      {selectedComplaint && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={closeModals}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            onClick={(e) => e.stopPropagation()}
            className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-3xl bg-white p-6 shadow-xl"
          >
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <h3 className="text-xl font-black text-slate-900">{selectedComplaint.title}</h3>
                <p className="mt-1 text-sm text-slate-500">
                  #{selectedComplaint.id} • {selectedComplaint.senderName || "—"}
                </p>
              </div>
              <StatusBadge status={selectedComplaint.status} />
            </div>
            <div className="space-y-4">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Danh mục</p>
                <p className="mt-1 text-sm font-semibold text-slate-800">
                  {CATEGORY_LABEL[selectedComplaint.category] || selectedComplaint.category}
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Nội dung khiếu nại</p>
                <p className="mt-2 text-sm leading-6 text-slate-700">{selectedComplaint.content}</p>
              </div>
              {selectedComplaint.response && (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                  <p className="text-xs font-bold uppercase tracking-wide text-emerald-700">Nội dung xử lý</p>
                  <p className="mt-2 text-sm leading-6 text-emerald-800">{selectedComplaint.response}</p>
                </div>
              )}
            </div>
            <div className="mt-5 flex justify-end">
              <Button variant="secondary" onClick={closeModals}>Đóng</Button>
            </div>
          </motion.div>
        </div>
      )}

      {selectedNotification && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={closeModals}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            onClick={(e) => e.stopPropagation()}
            className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-3xl bg-white p-6 shadow-xl"
          >
            <div className="mb-4">
              <h3 className="text-xl font-black text-slate-900">{selectedNotification.title}</h3>
              <p className="mt-1 text-sm text-slate-500">{formatDate(selectedNotification.sentAt)}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-700">
              {selectedNotification.content}
            </div>
            <div className="mt-5 flex justify-end">
              <Button variant="secondary" onClick={closeModals}>Đóng</Button>
            </div>
          </motion.div>
        </div>
      )}
    </>
  );
}
