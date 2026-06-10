import React from "react";
import { BrowserRouter } from "react-router-dom";
import { AlertCircle } from "lucide-react";
import { AuthProvider } from "./context/AuthContext";
import { AppRoutes } from "./routes/AppRoutes";

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
                <p className="text-sm text-slate-500">Bạn có thể bấm tải lại trang. Nếu vẫn lỗi, gửi mình ảnh Console.</p>
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
    <AuthProvider>
      <AppErrorBoundary>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </AppErrorBoundary>
    </AuthProvider>
  );
}
