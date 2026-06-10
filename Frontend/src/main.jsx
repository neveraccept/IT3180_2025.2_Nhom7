import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";

const root = document.getElementById("root");

if (!root) {
  document.body.innerHTML = "<div style='font-family:Arial;padding:24px'>Không tìm thấy thẻ #root trong index.html</div>";
} else {
  createRoot(root).render(
    <StrictMode>
      <App />
    </StrictMode>
  );
}
