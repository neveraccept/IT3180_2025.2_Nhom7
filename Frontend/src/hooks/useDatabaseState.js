import { useState } from "react";

export function useDatabaseState(key, fallbackValue) {
  const [value, setValueState] = useState(() => {
    try {
      const saved = localStorage.getItem(key);
      return saved ? JSON.parse(saved) : fallbackValue;
    } catch {
      return fallbackValue;
    }
  });

  const setValue = (updater) => {
    setValueState((prev) => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      try {
        localStorage.setItem(key, JSON.stringify(next));
      } catch {
        // Nếu trình duyệt chặn localStorage thì vẫn giữ dữ liệu trong state.
      }
      return next;
    });
  };

  return [value, setValue];
}
