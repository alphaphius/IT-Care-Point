import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import { registerSW } from "virtual:pwa-register";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { SessionProvider } from "@/lib/session";
import { ToastProvider } from "@/components/ui";

registerSW({ immediate: true });

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <SessionProvider>
        <ToastProvider>
          <App />
        </ToastProvider>
      </SessionProvider>
    </BrowserRouter>
  </StrictMode>,
);
