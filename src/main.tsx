import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import "@fontsource/newsreader/400.css";
import "@fontsource/newsreader/500.css";
import "@fontsource/manrope/400.css";
import "@fontsource/manrope/600.css";
import "@fontsource/manrope/700.css";
import "@fontsource/ibm-plex-mono/400.css";
import "@fontsource/ibm-plex-mono/500.css";

import "./design/tokens.css";
import "./design/global.css";
import "./design/context.css";
import "./design/motion.css";

import { App } from "./app/App.tsx";

const container = document.getElementById("root");

if (!container) {
  throw new Error("ProofRoom could not find the root element.");
}

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
