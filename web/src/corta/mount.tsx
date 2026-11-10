// CORTA CUSTOMIZATION
// Mounts the Corta interface (see entry.tsx).

import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router";

import { HERMES_BASE_PATH } from "@/lib/api";
import { startChunkLoadRecovery } from "@/lib/chunk-load-recovery";

import "./corta.css";
import CortaApp from "./CortaApp";
import { installAppearance } from "./lib/appearance";

// A stale tab asking for a chunk the server no longer has reloads once.
if (import.meta.env.PROD) startChunkLoadRecovery();

installAppearance();

createRoot(document.getElementById("root")!).render(
  <BrowserRouter basename={HERMES_BASE_PATH || undefined}>
    <CortaApp />
  </BrowserRouter>,
);
