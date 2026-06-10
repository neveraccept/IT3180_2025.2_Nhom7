import { createContext, useContext, useState } from "react";
import { users as initialUsers } from "../data/mockData";

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [users, setUsers] = useState(() => {
    try {
      const saved = localStorage.getItem("bluemoon_users");
      return saved ? JSON.parse(saved) : initialUsers;
    } catch {
      return initialUsers;
    }
  });

  const updateUsers = (updater) => {
    setUsers((prev) => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      try {
        localStorage.setItem("bluemoon_users", JSON.stringify(next));
      } catch {
        // ignore localStorage errors
      }
      return next;
    });
  };

  const addUser = (user) => {
    updateUsers((prev) => {
      if (prev.some((item) => item.username === user.username)) return prev;
      return [...prev, user];
    });
  };

  return (
    <AppContext.Provider value={{ users, setUsers: updateUsers, addUser }}>
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useAppContext must be used inside AppProvider");
  }
  return context;
}
