import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Building2, Users, WalletCards, Car, Bike, ReceiptText, Bell, MessageSquareWarning, BarChart3, Home, ShieldCheck, Search, Plus, Download, LogOut, Menu, X, CheckCircle2, Clock3, AlertCircle, UserRoundCog, KeyRound, MapPin, Phone, Mail, CalendarDays, Sparkles, HeartHandshake, Dumbbell, Waves, Gamepad2, ShoppingCart, Trees
} from "lucide-react";
import { useAppContext } from "../context/AppContext";
import { useDatabaseState } from "../hooks/useDatabaseState";
import {
  adminNav,
  residentNav,
  apartments,
  residents,
  fees,
  payments,
  initialVehicles,
  initialUtilities,
  complaints,
  notifications,
  users,
  initialRegistrations,
  initialFeeCatalog,
} from "../data/mockData";
import {
  money,
  normalizeNotifications,
  getHouseholds,
  calculateMandatoryAmount,
  calculatePaymentStatus,
  makePaymentKey,
  buildPaymentRecordsForFee,
  buildInitialPaymentRecords,
  adminBankInfo,
  getResidentRoomByUser,
  getResidentDisplayName,
  parseNumberValue,
  getUtilityName,
  getUtilityUnitText,
  buildHouseholdBillRows,
  getPeriodSummaryText,
} from "../utils/helpers";
import {
  Badge,
  Button,
  Card,
  StatusBadge,
  DataTable,
  Input,
  Select,
  NotificationDetailModal,
  ComplaintReadOnlyModal,
  PaymentQRModal,
} from "../components/common";
import { SectionHeader } from "../components/layout/SectionHeader";
import { loginAPI, registerAPI, approveRegistrationAPI, rejectRegistrationAPI } from "../config/api";

export function IntroductionPage({ onStartLogin, onStartRegister }) {
  const emptyContactForm = { name: "", phone: "", email: "", message: "" };
  const [contactForm, setContactForm] = useState(emptyContactForm);
  const [contactSent, setContactSent] = useState(false);

  const scrollToSection = (id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const handleContactSubmit = (e) => {
    e.preventDefault();

    if (!contactForm.name.trim() || !contactForm.phone.trim() || !contactForm.message.trim()) {
      alert("Vui lòng nhập họ tên, số điện thoại và nội dung cần hỗ trợ.");
      return;
    }

    const newRequest = {
      id: Date.now(),
      ...contactForm,
      createdAt: new Date().toLocaleString("vi-VN", { dateStyle: "short", timeStyle: "short" }),
      status: "NEW",
    };

    try {
      const saved = JSON.parse(localStorage.getItem("bluemoon_contact_requests") || "[]");
      localStorage.setItem("bluemoon_contact_requests", JSON.stringify([newRequest, ...saved]));
    } catch {
      // Nếu trình duyệt chặn localStorage thì vẫn hiển thị gửi thành công trên giao diện.
    }

    setContactForm(emptyContactForm);
    setContactSent(true);
    setTimeout(() => setContactSent(false), 3000);
  };

  const projectCards = [
    { icon: Building2, label: "Tên dự án", value: "Chung cư BlueMoon", sub: "Không gian sống hiện đại" },
    { icon: MapPin, label: "Vị trí địa lý", value: "Ngã tư Văn Phú", sub: "Kết nối giao thông thuận tiện" },
    { icon: Home, label: "Quy mô", value: "30 tầng / 450m²", sub: "1 kiot, 4 tầng đế, 24 tầng ở, 1 penthouse" },
    { icon: CalendarDays, label: "Thời gian", value: "2021 - 2023", sub: "Khởi công 2021, hoàn thành 2023" },
    { icon: Users, label: "Cư dân", value: "Hộ gia đình, cá nhân", sub: "Hướng đến cộng đồng văn minh" },
  ];

  const values = [
    { icon: ShieldCheck, title: "An toàn", desc: "Hệ thống an ninh 24/7, tiêu chuẩn PCCC hiện đại, đảm bảo sự an tâm tuyệt đối cho mọi gia đình.", tone: "from-emerald-100 to-white" },
    { icon: ReceiptText, title: "Minh bạch", desc: "Mọi hoạt động quản lý, thu chi kinh phí bảo trì đều được công khai minh bạch đến từng hộ dân.", tone: "from-sky-100 to-white" },
    { icon: CheckCircle2, title: "Chuyên nghiệp", desc: "Công tác vận hành, bảo dưỡng cơ sở vật chất được thực hiện định kỳ và duy trì chất lượng sống cao.", tone: "from-amber-100 to-white" },
    { icon: Sparkles, title: "Tiện nghi", desc: "Thiết kế thông minh với 1 tầng kiot và 4 tầng đế thương mại, cung cấp đầy đủ tiện ích mua sắm, giải trí tại chỗ.", tone: "from-violet-100 to-white" },
    { icon: HeartHandshake, title: "Cộng đồng", desc: "Môi trường sống thân thiện, gắn kết, nơi Ban quản trị và cư dân cùng tạo diện mạo chung cho tòa nhà.", tone: "from-rose-100 to-white" },
  ];

  const amenities = [
    { icon: Waves, title: "Hồ bơi vô cực", desc: "Thư giãn trong làn nước mát lành với tầm nhìn tuyệt đẹp." },
    { icon: Dumbbell, title: "Phòng gym hiện đại", desc: "Trang thiết bị chuẩn quốc tế giúp duy trì sức khỏe mỗi ngày." },
    { icon: Trees, title: "Công viên nội khu", desc: "Không gian xanh mát, đường dạo bộ thư thái cho cả gia đình." },
    { icon: Gamepad2, title: "Khu vui chơi trẻ em", desc: "Sân chơi an toàn, phát triển thể chất và trí tuệ cho bé." },
    { icon: Car, title: "Bãi đỗ xe thông minh", desc: "Hệ thống đỗ xe rộng rãi, an toàn, quản lý bằng thẻ từ." },
    { icon: ShoppingCart, title: "Siêu thị tiện lợi", desc: "Đáp ứng đầy đủ nhu cầu mua sắm thiết yếu ngay dưới sảnh." },
    { icon: ShieldCheck, title: "Hệ thống an ninh 24/7", desc: "Camera giám sát toàn khu cùng đội ngũ bảo vệ chuyên nghiệp." },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-900">
      <section
        className="relative min-h-screen overflow-hidden text-white"
        style={{
          backgroundImage:
            "linear-gradient(rgba(2,6,23,0.78), rgba(2,6,23,0.86)), radial-gradient(circle at 18% 18%, rgba(37,99,235,0.35), transparent 28%), radial-gradient(circle at 82% 22%, rgba(14,165,233,0.26), transparent 30%), linear-gradient(135deg, #020617 0%, #111827 48%, #0f172a 100%)",
        }}
      >
        <div className="absolute inset-0 opacity-20">
          <div className="absolute left-[12%] top-28 h-[560px] w-[360px] rotate-12 rounded-[48px] border border-white/20 bg-white/5" />
          <div className="absolute right-[15%] top-24 h-[620px] w-[430px] -rotate-6 rounded-[56px] border border-white/10 bg-white/5" />
          <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-slate-950 to-transparent" />
        </div>

        <nav className="absolute inset-x-0 top-0 z-20">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-6">
            <button onClick={() => scrollToSection("hero")} className="flex items-center gap-3 text-left">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10 text-sky-300 ring-1 ring-white/15 backdrop-blur">
                <Building2 className="h-6 w-6" />
              </div>
              <div>
                <div className="font-black tracking-tight">BlueMoon</div>
                <div className="text-xs text-slate-300">Chung cư văn minh</div>
              </div>
            </button>
            <div className="hidden items-center gap-6 text-sm font-semibold text-slate-200 md:flex">
              <button onClick={() => scrollToSection("overview")} className="hover:text-white">Tổng quan</button>
              <button onClick={() => scrollToSection("mission")} className="hover:text-white">Tầm nhìn</button>
              <button onClick={() => scrollToSection("amenities")} className="hover:text-white">Tiện ích</button>
              <button onClick={() => scrollToSection("contact")} className="hover:text-white">Liên hệ</button>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="secondary" className="border-white/20 bg-white/10 text-white ring-white/20 hover:bg-white/15" onClick={onStartLogin}>
                Đăng nhập
              </Button>
              <Button variant="soft" className="hidden px-4 py-2 font-bold text-sky-700 md:inline-flex" onClick={onStartRegister}>
                Đăng ký
              </Button>
            </div>
          </div>
        </nav>

        <div id="hero" className="relative z-10 mx-auto flex min-h-screen max-w-6xl flex-col items-center justify-center px-5 py-32 text-center">
          <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} className="inline-flex rounded-full bg-white/10 px-5 py-2 text-sm font-bold text-slate-100 ring-1 ring-white/20 backdrop-blur">
            Không gian sống lý tưởng · Cộng đồng văn minh
          </motion.div>
          <motion.h1 initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }} className="mt-8 max-w-4xl text-5xl font-black leading-tight tracking-tight md:text-7xl">
            Chào mừng đến với <span className="block bg-gradient-to-r from-sky-300 to-blue-500 bg-clip-text text-transparent">Chung cư BlueMoon</span>
          </motion.h1>
          <motion.p initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.16 }} className="mt-6 max-w-2xl text-lg leading-8 text-slate-200">
            Tọa lạc ngay ngã tư Văn Phú, BlueMoon là biểu tượng của sự hiện đại, minh bạch và an toàn — nơi bạn gọi là “Nhà”.
          </motion.p>
          <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.24 }} className="mt-9 flex flex-col justify-center gap-4 sm:flex-row">
            <Button className="px-8 py-3 shadow-lg shadow-blue-900/30" onClick={() => scrollToSection("overview")}>Khám phá dự án</Button>
            <Button variant="secondary" className="border-white/20 bg-white/10 px-8 py-3 text-white ring-white/20 hover:bg-white/15" onClick={() => scrollToSection("amenities")}>Xem tiện ích</Button>
          </motion.div>
        </div>
      </section>

      <section id="overview" className="bg-blue-50 py-24">
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-5 lg:grid-cols-[1fr_0.95fr]">
          <div>
            <Badge tone="blue">Tổng Quan Dự Án</Badge>
            <h2 className="mt-5 max-w-2xl text-4xl font-black leading-tight tracking-tight text-slate-950 md:text-5xl">Biểu tượng sống mới tại Ngã tư Văn Phú</h2>
            <p className="mt-6 max-w-2xl text-base leading-8 text-slate-600">
              Chung cư BlueMoon được xây dựng với tâm huyết kiến tạo một không gian sống hoàn hảo. Khi sở hữu nhà tại đây, cư dân sẽ cùng đóng góp kinh phí định kỳ để Ban quản trị vận hành và bảo dưỡng thường xuyên, đảm bảo cơ sở vật chất luôn trong tình trạng tốt nhất.
            </p>
            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              {projectCards.map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.label} className="rounded-2xl bg-white/80 p-5 shadow-sm ring-1 ring-white/80 backdrop-blur">
                    <div className="flex gap-4">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                        <Icon className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-slate-500">{item.label}</p>
                        <p className="mt-1 font-black text-slate-900">{item.value}</p>
                        <p className="mt-1 text-xs leading-5 text-slate-500">{item.sub}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="relative">
            <div className="aspect-[4/5] overflow-hidden rounded-[32px] border-8 border-white bg-gradient-to-br from-sky-100 via-white to-blue-200 shadow-2xl shadow-blue-200">
              <div className="relative flex h-full items-end justify-center p-8">
                <div className="absolute left-8 top-8 h-40 w-24 rounded-3xl bg-white/75 shadow-xl" />
                <div className="absolute right-10 top-16 h-56 w-32 rounded-3xl bg-sky-200/80 shadow-xl" />
                <div className="absolute bottom-12 left-1/2 h-[78%] w-56 -translate-x-1/2 rounded-t-[42px] bg-slate-900 shadow-2xl">
                  <div className="grid h-full grid-cols-4 gap-3 p-7">
                    {Array.from({ length: 32 }).map((_, index) => (
                      <span key={index} className="rounded-md bg-white/20" />
                    ))}
                  </div>
                </div>
                <div className="absolute bottom-8 left-8 rounded-2xl bg-white px-6 py-5 shadow-xl">
                  <div className="flex items-center gap-3">
                    <Building2 className="h-6 w-6 text-emerald-600" />
                    <div>
                      <p className="text-3xl font-black text-slate-900">30</p>
                      <p className="text-sm text-slate-500">Tầng cao</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="mission" className="relative overflow-hidden bg-slate-950 py-24 text-white">
        <div className="absolute inset-0 opacity-25" style={{ backgroundImage: "radial-gradient(circle at 25% 20%, rgba(14,165,233,.5), transparent 28%), radial-gradient(circle at 78% 60%, rgba(37,99,235,.4), transparent 30%)" }} />
        <div className="relative mx-auto max-w-6xl px-5 text-center">
          <Badge tone="blue">Tầm Nhìn & Sứ Mệnh</Badge>
          <h2 className="mt-5 text-4xl font-black tracking-tight md:text-5xl">Định hướng tương lai</h2>
          <p className="mx-auto mt-5 max-w-2xl leading-8 text-slate-300">Chúng tôi không chỉ xây dựng một tòa nhà, mà còn nỗ lực kiến tạo một cộng đồng bền vững, mang lại giá trị thiết thực nhất cho cư dân BlueMoon.</p>
          <div className="mt-12 grid gap-6 md:grid-cols-2">
            <Card className="border-white/10 bg-white/10 p-8 text-left text-white backdrop-blur">
              <div className="mb-7 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-400 to-blue-600 text-white"><Sparkles className="h-8 w-8" /></div>
              <h3 className="text-3xl font-black">Tầm nhìn</h3>
              <p className="mt-5 leading-8 text-slate-200">Trở thành không gian sống kiểu mẫu tại khu vực Văn Phú, nơi hội tụ những giá trị sống hiện đại, văn minh và phát triển bền vững. BlueMoon hướng tới việc xây dựng một biểu tượng của sự an cư lạc nghiệp cho mọi gia đình và chuyên gia.</p>
            </Card>
            <Card className="border-white/10 bg-white/10 p-8 text-left text-white backdrop-blur">
              <div className="mb-7 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-fuchsia-400 to-pink-600 text-white"><HeartHandshake className="h-8 w-8" /></div>
              <h3 className="text-3xl font-black">Sứ mệnh</h3>
              <p className="mt-5 leading-8 text-slate-200">Kiến tạo một cộng đồng gắn kết, cung cấp môi trường sống an toàn, tiện nghi với dịch vụ quản lý chất lượng cao. Đảm bảo mọi hoạt động vận hành, thu chi bảo trì luôn minh bạch, hiệu quả vì lợi ích chung và do chính cư dân làm chủ.</p>
            </Card>
          </div>
        </div>
      </section>

      <section className="bg-blue-50 py-24">
        <div className="mx-auto max-w-6xl px-5 text-center">
          <Badge tone="blue">5 Giá Trị Cốt Lõi</Badge>
          <h2 className="mt-5 text-4xl font-black tracking-tight text-slate-950 md:text-5xl">Nền tảng của sự phát triển</h2>
          <p className="mx-auto mt-5 max-w-3xl leading-8 text-slate-600">Những giá trị vàng định hình văn hóa, chất lượng sống và cam kết của Ban quản trị đối với cộng đồng cư dân Chung cư BlueMoon.</p>
          <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {values.map((item) => {
              const Icon = item.icon;
              return (
                <Card key={item.title} className={`bg-gradient-to-br ${item.tone} p-7 text-left transition hover:-translate-y-1 hover:shadow-xl`}>
                  <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-blue-600 shadow-sm"><Icon className="h-7 w-7" /></div>
                  <h3 className="text-2xl font-black text-slate-950">{item.title}</h3>
                  <p className="mt-4 leading-7 text-slate-600">{item.desc}</p>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      <section id="amenities" className="bg-blue-50 py-24">
        <div className="mx-auto max-w-6xl px-5 text-center">
          <Badge tone="blue">Trải nghiệm sống</Badge>
          <h2 className="mt-5 text-4xl font-black tracking-tight text-slate-950 md:text-5xl">Tiện ích đẳng cấp</h2>
          <p className="mx-auto mt-5 max-w-3xl leading-8 text-slate-600">Hệ thống tiện ích nội khu đa dạng được thiết kế đồng bộ, mang đến những trải nghiệm sống trọn vẹn nhất cho cộng đồng cư dân.</p>
          <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {amenities.map((item) => {
              const Icon = item.icon;
              return (
                <Card key={item.title} className="p-6 text-left transition hover:-translate-y-1 hover:shadow-xl">
                  <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-sky-50 text-blue-600"><Icon className="h-7 w-7" /></div>
                  <h3 className="text-lg font-black text-slate-950">{item.title}</h3>
                  <p className="mt-3 text-sm leading-6 text-slate-600">{item.desc}</p>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      <section id="contact" className="bg-blue-900 py-24 text-white">
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-5 lg:grid-cols-[0.95fr_1.05fr]">
          <div>
            <Badge tone="blue">Kết nối với chúng tôi</Badge>
            <h2 className="mt-5 text-4xl font-black tracking-tight md:text-5xl">Thông tin liên hệ</h2>
            <p className="mt-5 max-w-xl leading-8 text-blue-100">Bạn có câu hỏi hoặc cần hỗ trợ? Hãy liên hệ với Ban quản lý Chung cư BlueMoon để được giải đáp nhanh chóng nhất.</p>
            <div className="mt-10 space-y-6">
              {[
                { icon: MapPin, label: "Địa chỉ văn phòng quản lý", value: "Tầng 1, Chung cư BlueMoon, Ngã tư Văn Phú, Quận Hà Đông, Hà Nội" },
                { icon: Phone, label: "Số điện thoại", value: "(024) 1234 5678" },
                { icon: Mail, label: "Email hỗ trợ", value: "banquanly@bluemoon.vn" },
                { icon: Clock3, label: "Giờ làm việc", value: "08:00 - 17:30 (Thứ 2 - Thứ 6) · 08:00 - 12:00 (Thứ 7)" },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.label} className="flex gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-blue-100"><Icon className="h-5 w-5" /></div>
                    <div>
                      <p className="text-sm text-blue-200">{item.label}</p>
                      <p className="mt-1 font-bold text-white">{item.value}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <Card className="bg-white p-8 text-slate-900 shadow-2xl shadow-blue-950/20">
            <h3 className="text-2xl font-black">Gửi tin nhắn cho chúng tôi</h3>
            <p className="mt-2 text-sm text-slate-500">Chúng tôi sẽ phản hồi bạn trong thời gian sớm nhất.</p>
            {contactSent && <div className="mt-5 rounded-xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700 ring-1 ring-emerald-200">✓ Đã lưu yêu cầu liên hệ vào hệ thống.</div>}
            <form onSubmit={handleContactSubmit} className="mt-6 space-y-4">
              <Input label="Họ và tên" placeholder="Nhập họ và tên của bạn" value={contactForm.name} onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })} />
              <div className="grid gap-4 md:grid-cols-2">
                <Input label="Số điện thoại" placeholder="Số điện thoại" value={contactForm.phone} onChange={(e) => setContactForm({ ...contactForm, phone: e.target.value })} />
                <Input label="Email" type="email" placeholder="Địa chỉ email" value={contactForm.email} onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })} />
              </div>
              <label className="block">
                <span className="mb-1.5 block text-sm font-semibold text-slate-700">Nội dung</span>
                <textarea rows={5} className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-sky-400 focus:ring-4 focus:ring-sky-100" placeholder="Nhập nội dung cần hỗ trợ..." value={contactForm.message} onChange={(e) => setContactForm({ ...contactForm, message: e.target.value })} />
              </label>
              <Button className="w-full py-3" type="submit">Gửi yêu cầu</Button>
            </form>
          </Card>
        </div>
      </section>

      <footer className="bg-slate-950 py-7 text-white">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-5 md:flex-row">
          <div className="flex items-center gap-2 font-black"><Building2 className="h-5 w-5" /> BlueMoon</div>
          <p className="text-sm text-slate-400">© 2026 Chung cư BlueMoon. Vận hành bởi Ban quản trị tòa nhà.</p>
        </div>
      </footer>
    </div>
  );
}
