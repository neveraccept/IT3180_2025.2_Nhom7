import { users } from "../data/mockData";

const wait = (ms = 250) => new Promise((resolve) => setTimeout(resolve, ms));

export async function loginAPI(username, password) {
  await wait();
  const savedUsers = (() => {
    try {
      return JSON.parse(localStorage.getItem("bluemoon_users") || "null") || users;
    } catch {
      return users;
    }
  })();

  const user = savedUsers.find(
    (item) => item.username === username && item.password === password && item.active !== "Khoá"
  );

  if (!user) {
    return { success: false, message: "Sai tài khoản hoặc mật khẩu" };
  }

  return {
    success: true,
    token: "mock-token",
    user: {
      ...user,
      fullName: user.fullName || user.name || user.username,
      name: user.name || user.fullName || user.username,
    },
  };
}

export async function registerAPI(...args) {
  await wait();
  return { success: true, data: args };
}

export async function approveRegistrationAPI() {
  await wait();
  return { success: true };
}

export async function rejectRegistrationAPI() {
  await wait();
  return { success: true };
}
