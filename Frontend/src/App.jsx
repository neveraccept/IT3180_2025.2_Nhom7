import React, { useState } from "react";
import { AlertCircle } from "lucide-react";
import { AppProvider } from "./context/AppContext";
import { useDatabaseState } from "./hooks/useDatabaseState";
import { initialRegistrations, initialFeeCatalog, complaints, notifications } from "./data/mockData";
import {
  normalizeNotifications,
  buildInitialPaymentRecords,
  buildPaymentRecordsForFee,
  getHouseholds,
  calculateMandatoryAmount,
  calculatePaymentStatus,
} from "./utils/helpers";
import { Layout } from "./components/layout/Layout";
import { IntroductionPage } from "./pages/IntroductionPage";
import { Login } from "./pages/LoginPage";
import "./App.css";


class AppErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error("BlueMoon render error:", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-50 p-6 text-slate-900">
          <div className="mx-auto max-w-2xl rounded-3xl border border-rose-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center gap-3">
              <div className="rounded-2xl bg-rose-50 p-3 text-rose-600">
                <AlertCircle className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-xl font-black">Có lỗi hiển thị giao diện</h1>
                <p className="text-sm text-slate-500">Mở F12 → Console để xem lỗi chi tiết.</p>
              </div>
            </div>
            <pre className="max-h-72 overflow-auto rounded-2xl bg-slate-950 p-4 text-xs text-white">
              {String(this.state.error?.message || this.state.error || "Không rõ lỗi")}
            </pre>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}


export default function App() {
  return (
    <AppProvider>
      <AppErrorBoundary>
        <AppContent />
      </AppErrorBoundary>
    </AppProvider>
  );
}

function AppContent() {
  const [user, setUser] = useState(null);
  const [showIntro, setShowIntro] = useState(true);
  const [authMode, setAuthMode] = useState("login");
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

  if (user) {
    return (
      <Layout
        user={user}
        setUser={setUser}
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

    if (showIntro) {
    return (
      <IntroductionPage
        onStartLogin={() => {
          setAuthMode("login");
          setShowIntro(false);
        }}
        onStartRegister={() => {
          setAuthMode("register");
          setShowIntro(false);
        }}
      />
    );
  }

  return (
    <Login
      setUser={setUser}
      initialMode={authMode}
      onBackIntro={() => setShowIntro(true)}
      registrations={registrations}
      setRegistrations={setRegistrations}
    />
  );
}
