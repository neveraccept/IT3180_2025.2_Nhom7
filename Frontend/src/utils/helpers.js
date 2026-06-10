export const money = (value) => new Intl.NumberFormat("vi-VN").format(value) + " đ";

export const normalizeNotifications = (source) =>
  source.map((item, index) => ({
    id: item.id || index + 1,
    title: item.title,
    content:
      item.content ||
      `Nội dung chi tiết của thông báo: ${item.title}. Vui lòng cư dân chú ý theo dõi và thực hiện đúng theo thông báo từ Ban quản trị BlueMoon.`,
    scope: item.scope,
    date: item.date,
    read: Boolean(item.read),
  }));

export const adminBankInfo = {
  bankName: "MB Bank",
  accountNumber: "0123456789",
  accountHolder: "BAN QUAN TRI CHUNG CU BLUEMOON",
};

export const getResidentDisplayName = (user) => user?.fullName || user?.name || user?.username || "Cư dân";

export const parseNumberValue = (value) => {
  if (value === "__") return 0;
  const number = Number(value);
  return Number.isNaN(number) ? 0 : number;
};

export const getUtilityName = (type) => {
  if (type === "ELECTRICITY") return "Điện";
  if (type === "WATER") return "Nước";
  if (type === "INTERNET") return "Internet";
  return type;
};

export const getUtilityUnitText = (type) => {
  if (type === "ELECTRICITY") return "đ/số";
  if (type === "WATER") return "đ/m³";
  return "đ/tháng";
};

export const getPeriodSummaryText = (bill) => {
  if (!bill.periods?.length) return "__";
  if (bill.periods.length === 1) return `Tháng ${bill.periods[0].month}/${bill.periods[0].year}`;
  const first = bill.periods[0];
  const last = bill.periods[bill.periods.length - 1];
  return `${bill.periods.length} kỳ (${first.month}/${first.year} - ${last.month}/${last.year})`;
};
