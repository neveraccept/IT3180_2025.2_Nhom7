// ============================================================
//  AppShell — vùng ứng dụng sau khi đăng nhập (được ProtectedRoute bọc)
//  Giữ toàn bộ state dữ liệu mô phỏng và render Layout (hub điều hướng).
//  Lấy user/logout từ AuthContext thay cho state cục bộ như trước.
// ============================================================
import { useAuth } from "../context/AuthContext";
import {
  initialRegistrations,
  initialFeeCatalog,
  complaints,
  notifications,
} from "../data/mockData";
import {
  getHouseholds,
  calculateMandatoryAmount,
  calculatePaymentStatus,
  buildPaymentRecordsForFee,
  buildInitialPaymentRecords,
  normalizeNotifications,
} from "../utils/helpers";
import { useDatabaseState } from "../hooks/useDatabaseState";
import { Layout } from "../components/layout/Layout";

export function AppShell() {
  const { user, setUser, logout } = useAuth();

  const [registrations, setRegistrations] = useDatabaseState("bluemoon_registrations", initialRegistrations);
  const [feesList, setFeesList] = useDatabaseState("bluemoon_fees", initialFeeCatalog);
  const [paymentRecords, setPaymentRecords] = useDatabaseState(
    "bluemoon_payments",
    buildInitialPaymentRecords(initialFeeCatalog)
  );
  const [complaintsList, setComplaintsList] = useDatabaseState("bluemoon_complaints", complaints);
  const [notificationList, setNotificationList] = useDatabaseState(
    "bluemoon_notifications",
    normalizeNotifications(notifications)
  );

  const syncPaymentsForMandatoryFee = (fee, month = new Date().getMonth() + 1, year = new Date().getFullYear()) => {
    if (!fee || fee.type !== "MANDATORY" || fee.status !== "ACTIVE") return;

    setPaymentRecords((prev) => {
      const generated = buildPaymentRecordsForFee(fee, month, year, prev);
      const updatedExisting = prev.map((record) => {
        if (record.feeId !== fee.id || Number(record.month) !== Number(month) || Number(record.year) !== Number(year)) {
          return record;
        }

        const household = getHouseholds().find((item) => item.room === record.room);
        const amountDue = household ? calculateMandatoryAmount(fee, household) : record.amountDue;

        return {
          ...record,
          feeName: fee.name,
          chargeMethod: fee.chargeMethod,
          unitPrice: Number(fee.unitPrice || 0),
          amountDue,
          status: calculatePaymentStatus(amountDue, record.amountPaid),
        };
      });

      return [...updatedExisting, ...generated];
    });
  };

  const removePaymentsForFee = (feeId) => {
    setPaymentRecords((prev) => prev.filter((record) => record.feeId !== feeId));
  };

  return (
    <Layout
      user={user}
      setUser={setUser}
      logout={logout}
      registrations={registrations}
      setRegistrations={setRegistrations}
      feesList={feesList}
      setFeesList={setFeesList}
      paymentRecords={paymentRecords}
      setPaymentRecords={setPaymentRecords}
      syncPaymentsForMandatoryFee={syncPaymentsForMandatoryFee}
      removePaymentsForFee={removePaymentsForFee}
      complaintsList={complaintsList}
      setComplaintsList={setComplaintsList}
      notificationList={notificationList}
      setNotificationList={setNotificationList}
    />
  );
}
