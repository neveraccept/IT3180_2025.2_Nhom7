import { createContext, useContext, useState } from "react";

const AppContext = createContext();

export const AppProvider = ({ children }) => {
  const [users, setUsers] = useState([
    { username: "admin", fullName: "Admin BlueMoon", role: "ADMIN", email: "admin@bluemoon.vn", active: "Hoạt động" },
    { username: "nguyenma", fullName: "Nguyễn Minh Anh", role: "RESIDENT", email: "minhanh@email.com", active: "Hoạt động" },
  ]);

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
