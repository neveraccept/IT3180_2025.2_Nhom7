import { useState } from "react";
import { Building2, X, Menu, LogOut } from "lucide-react";
import { adminNav, residentNav } from "../../data/navigation";
import { Badge, Button } from "../common";
import { Dashboard } from "../../pages/Dashboard";
import { Registrations } from "../../pages/Registrations";
import { Accounts } from "../../pages/Accounts";
import { Apartments } from "../../pages/Apartments";
import { Residents } from "../../pages/Residents";
import { Fees } from "../../pages/Fees";
import { Payments } from "../../pages/Payments";
import { Vehicles } from "../../pages/Vehicles";
import { Utilities } from "../../pages/Utilities";
import { Complaints } from "../../pages/Complaints";
import { Notifications } from "../../pages/Notifications";
import { Statistics } from "../../pages/Statistics";
import { AuditLogs } from "../../pages/AuditLogs";
import { MyFees } from "../../pages/MyFees";
import { Profile } from "../../pages/Profile";

export function Layout({ user, setUser, logout }) {
  const nav = user.role === "ADMIN" ? adminNav : residentNav;
  const [active, setActive] = useState("dashboard");
  const [open, setOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <aside className={`fixed inset-y-0 left-0 z-40 w-72 transform border-r border-slate-200 bg-white transition lg:translate-x-0 ${open ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="flex h-16 items-center justify-between border-b border-slate-100 px-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-sky-600 text-white">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <div className="font-black">BlueMoon</div>
              <div className="text-xs text-slate-500">Phần mềm quản lý chung cư</div>
            </div>
          </div>
          <button className="lg:hidden" onClick={() => setOpen(false)}><X className="h-5 w-5" /></button>
        </div>
        <nav className="space-y-1 p-4">
          {nav.map((item) => {
            const Icon = item.icon;
            const selected = active === item.key;
            return (
              <button
                key={item.key}
                onClick={() => {
                  setActive(item.key);
                  setOpen(false);
                }}
                className={`flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-bold transition ${selected ? "bg-sky-50 text-sky-700 ring-1 ring-sky-100" : "text-slate-600 hover:bg-slate-50"}`}
              >
                <Icon className="h-5 w-5" />
                {item.label}
              </button>
            );
          })}
        </nav>
      </aside>

      <main className="lg:pl-72">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200 bg-white/85 px-4 backdrop-blur md:px-8">
          <div className="flex items-center gap-3">
            <button className="rounded-xl p-2 hover:bg-slate-100 lg:hidden" onClick={() => setOpen(true)}><Menu className="h-5 w-5" /></button>
            <div>
              <div className="text-sm text-slate-500">Xin chào,</div>
              <div className="font-black">{user.name}</div>
            </div>
            <Badge tone={user.role === "ADMIN" ? "blue" : "green"}>{user.role}</Badge>
          </div>
          <Button variant="secondary" onClick={() => logout?.()}><LogOut className="h-4 w-4" /> Đăng xuất</Button>
        </header>
        <div className="p-4 md:p-8">
          <Page
            active={active}
            user={user}
            setUser={setUser}
            role={user.role}
          />
        </div>
      </main>
    </div>
  );
}

export function Page({
  active,
  user,
  setUser,
  role,
}) {
  if (active === "dashboard") {
    return <Dashboard role={role} />;
  }
  if (active === "registrations") return <Registrations />;
  if (active === "accounts") return <Accounts />;
  if (active === "apartments") return <Apartments />;
  if (active === "residents") return <Residents />;
  if (active === "fees") return <Fees />;
  if (active === "payments") return <Payments />;
  if (active === "vehicles") return <Vehicles role={role} user={user} />;
  if (active === "utilities") return <Utilities />;
  if (active === "complaints") {
    return <Complaints role={role} user={user} />;
  }
  if (active === "notifications") {
    return <Notifications role={role} />;
  }
  if (active === "statistics") return <Statistics />;
  if (active === "auditLogs") return <AuditLogs />;
  if (active === "myFees") return <MyFees user={user} />;
  if (active === "profile") return <Profile user={user} setUser={setUser} />;
  return <Dashboard role={role} />;
}
