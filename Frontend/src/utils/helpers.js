import { apartments, residents } from "../data/mockData";

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

export const getHouseholds = () =>
  apartments
    .filter((apartment) => apartment.status === "OCCUPIED")
    .map((apartment) => ({
      room: apartment.code,
      owner: apartment.owner,
      floor: apartment.floor,
      area: apartment.area,
    }));

export const calculateMandatoryAmount = (fee, household) => {
  if (!fee || fee.type !== "MANDATORY" || fee.status !== "ACTIVE") return 0;
  if (fee.chargeMethod === "PER_M2") return Math.round(Number(household.area || 0) * Number(fee.unitPrice || 0));
  if (fee.chargeMethod === "FIXED") return Number(fee.unitPrice || 0);
  return 0;
};

export const calculatePaymentStatus = (amountDue, amountPaid) =>
  Number(amountPaid || 0) >= Number(amountDue || 0) && Number(amountDue || 0) > 0 ? "PAID" : "UNPAID";

export const makePaymentKey = (feeId, room, month, year) => `${feeId}-${room}-${month}-${year}`;

export const buildPaymentRecordsForFee = (fee, month, year, existingRecords = []) => {
  if (!fee || fee.type !== "MANDATORY" || fee.status !== "ACTIVE") return [];

  return getHouseholds()
    .filter((household) => !existingRecords.some((record) => record.key === makePaymentKey(fee.id, household.room, month, year)))
    .map((household) => {
      const amountDue = calculateMandatoryAmount(fee, household);

      return {
        id: `PAY-${fee.id}-${household.room}-${month}-${year}`,
        key: makePaymentKey(fee.id, household.room, month, year),
        feeId: fee.id,
        feeName: fee.name,
        chargeMethod: fee.chargeMethod,
        unitPrice: Number(fee.unitPrice || 0),
        room: household.room,
        owner: household.owner,
        area: household.area,
        month,
        year,
        amountDue,
        amountPaid: 0,
        paidDate: "",
        note: "",
        status: "UNPAID",
        history: [],
      };
    });
};

export const buildInitialPaymentRecords = (feesSource, month = 5, year = 2026) =>
  feesSource.flatMap((fee) => buildPaymentRecordsForFee(fee, month, year, []));

export const adminBankInfo = {
  bankName: "MB Bank",
  accountNumber: "0123456789",
  accountHolder: "BAN QUAN TRI CHUNG CU BLUEMOON",
};

export const getResidentRoomByUser = (user) => {
  if (!user) return "1201";
  if (user.apartment) return String(user.apartment);
  if (user.room) return String(user.room);

  const userName = user.fullName || user.name || "";
  const matchedResident = residents.find((resident) => resident.name === userName);
  if (matchedResident?.room) return matchedResident.room;

  const matchedApartment = apartments.find((apartment) => apartment.owner === userName);
  if (matchedApartment?.code) return matchedApartment.code;

  const usernameMap = {
    resident1: "1201",
    resident2: "1808",
    resident3: "2405",
  };
  return usernameMap[user.username] || "1201";
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

export const buildHouseholdBillRows = ({
  rooms,
  paymentRecords,
  vehiclesList,
  utilitiesList,
  unitPrices,
  householdPaymentStatus,
  filters = { status: "ALL", month: "ALL", year: "ALL" },
}) => {
  const matchesPeriod = (month, year) => {
    if (filters.month && filters.month !== "ALL" && Number(month) !== Number(filters.month)) return false;
    if (filters.year && filters.year !== "ALL" && Number(year) !== Number(filters.year)) return false;
    return true;
  };

  const makePeriodKey = (month, year) => `${month}/${year}`;

  const calculateUtilityAmount = (utility) => {
    if (utility.type === "INTERNET") return parseNumberValue(unitPrices.INTERNET);
    return Math.max(0, parseNumberValue(utility.newIndex) - parseNumberValue(utility.oldIndex)) * parseNumberValue(unitPrices[utility.type]);
  };

  const buildItemsForPeriod = (room, month, year) => {
    const period = makePeriodKey(month, year);

    const feeItems = paymentRecords
      .filter((record) => String(record.room) === String(room) && Number(record.month) === Number(month) && Number(record.year) === Number(year))
      .map((record) => ({
        id: record.id,
        period,
        group: record.feeName?.toLowerCase().includes("phòng") ? "Tiền phòng" : "Khoản thu bắt buộc",
        name: record.feeName,
        formula: record.chargeMethod === "PER_M2"
          ? `${record.area || 0} m² × ${new Intl.NumberFormat("vi-VN").format(record.unitPrice || 0)} đ/m²`
          : `Cố định ${money(record.unitPrice || record.amountDue || 0)}`,
        amountDue: Number(record.amountDue || 0),
      }));

    const currentMonth = new Date().getMonth() + 1;
    const currentYear = new Date().getFullYear();
    const vehicleItems = Number(month) === Number(currentMonth) && Number(year) === Number(currentYear)
      ? vehiclesList
          .filter((vehicle) => String(vehicle.room) === String(room))
          .map((vehicle) => ({
            id: `VEHICLE-${vehicle.plate}-${vehicle.slot}-${room}-${month}-${year}`,
            period,
            group: "Gửi xe",
            name: `${vehicle.type}${vehicle.plate && vehicle.plate !== "__" ? ` - ${vehicle.plate}` : ""} (${vehicle.slot})`,
            formula: `${new Intl.NumberFormat("vi-VN").format(Number(vehicle.fee || 0))} đ/tháng`,
            amountDue: Number(vehicle.fee || 0),
          }))
      : [];

    const utilityItems = utilitiesList
      .filter((utility) => String(utility.room) === String(room) && Number(utility.month) === Number(month) && Number(utility.year) === Number(year))
      .map((utility) => {
        const amountDue = calculateUtilityAmount(utility);
        const formula = utility.type === "INTERNET"
          ? `${new Intl.NumberFormat("vi-VN").format(unitPrices.INTERNET || 0)} đ/tháng`
          : `(${utility.newIndex} - ${utility.oldIndex}) × ${new Intl.NumberFormat("vi-VN").format(unitPrices[utility.type] || 0)} ${getUtilityUnitText(utility.type)}`;

        return {
          id: `UTILITY-${utility.id}`,
          period,
          group: "Điện/Nước/Internet",
          name: getUtilityName(utility.type),
          formula,
          amountDue,
        };
      });

    return [...feeItems, ...vehicleItems, ...utilityItems];
  };

  return rooms
    .map((room) => {
      const roomText = String(room);
      const periods = new Set();
      const currentMonth = new Date().getMonth() + 1;
      const currentYear = new Date().getFullYear();

      paymentRecords.filter((record) => String(record.room) === roomText).forEach((record) => periods.add(`${record.month}|${record.year}`));
      utilitiesList.filter((utility) => String(utility.room) === roomText).forEach((utility) => periods.add(`${utility.month}|${utility.year}`));
      if (vehiclesList.some((vehicle) => String(vehicle.room) === roomText)) periods.add(`${currentMonth}|${currentYear}`);

      const parsedPeriods = Array.from(periods)
        .map((periodKey) => {
          const [month, year] = periodKey.split("|");
          return { month: Number(month), year: Number(year) };
        })
        .filter(({ month, year }) => matchesPeriod(month, year))
        .sort((a, b) => Number(a.year) - Number(b.year) || Number(a.month) - Number(b.month));

      const items = parsedPeriods.flatMap(({ month, year }) => buildItemsForPeriod(roomText, month, year));
      const amountDue = items.reduce((sum, item) => sum + Number(item.amountDue || 0), 0);
      const savedPayment = householdPaymentStatus[roomText];
      const legacyPaid = paymentRecords
        .filter((record) => String(record.room) === roomText && matchesPeriod(record.month, record.year))
        .reduce((sum, record) => sum + Number(record.amountPaid || 0), 0);
      const amountPaid = savedPayment ? Number(savedPayment.amountPaid || 0) : legacyPaid;
      const household = getHouseholds().find((item) => String(item.room) === roomText);
      const fallbackRecord = paymentRecords.find((record) => String(record.room) === roomText);

      return {
        id: roomText,
        key: roomText,
        room: roomText,
        owner: household?.owner || fallbackRecord?.owner || "__",
        periods: parsedPeriods,
        items,
        amountDue,
        amountPaid,
        status: calculatePaymentStatus(amountDue, amountPaid),
        paidDate: savedPayment?.paidDate || "",
        note: savedPayment?.note || "",
      };
    })
    .filter((bill) => bill.amountDue > 0)
    .filter((bill) => !filters.status || filters.status === "ALL" || bill.status === filters.status);
};

export const getPeriodSummaryText = (bill) => {
  if (!bill.periods?.length) return "__";
  if (bill.periods.length === 1) return `Tháng ${bill.periods[0].month}/${bill.periods[0].year}`;
  const first = bill.periods[0];
  const last = bill.periods[bill.periods.length - 1];
  return `${bill.periods.length} kỳ (${first.month}/${first.year} - ${last.month}/${last.year})`;
};
