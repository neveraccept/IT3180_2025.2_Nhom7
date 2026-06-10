import { createContext, useContext, useState } from "react";

const AppContext = createContext();

export const AppProvider = ({ children }) => {
  // Danh sách tài khoản giờ được lấy trực tiếp từ API (GET /api/users) ở các trang.
  // Context này chỉ còn giữ chỗ cho dữ liệu dùng chung phía client nếu cần.
  const [users, setUsers] = useState([]);

  const addUser = (newUser) => {
    if (!users.find(u => u.username === newUser.username)) {
      setUsers([...users, newUser]);
    }
  };

  return (
    <AppContext.Provider value={{ users, setUsers, addUser }}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useAppContext must be used within AppProvider");
  }
  return context;
};
