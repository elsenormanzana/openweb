import { StrictMode } from "react";
import { createRoot, hydrateRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import "./index.css";
import App from "./App";
import { InitialDataProvider } from "@/lib/initialData";

const container = document.getElementById("root")!;
// Seeded by the SSR server; empty object on admin/SPA routes.
const initialData = window.__INITIAL_DATA__ ?? {};

const tree = (
  <StrictMode>
    <InitialDataProvider value={initialData}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </InitialDataProvider>
  </StrictMode>
);

// Public routes ship server-rendered markup inside #root — hydrate it so the
// painted HTML is reused. Admin/auth routes ship an empty shell — mount fresh.
if (container.hasChildNodes()) {
  hydrateRoot(container, tree);
} else {
  createRoot(container).render(tree);
}
