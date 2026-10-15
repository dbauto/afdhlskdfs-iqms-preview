import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { BrowserRouter, HashRouter } from "react-router-dom"

import "./index.css"
import App from "./App"
import { StoreProvider } from "@/lib/store"
import { Toaster } from "@/components/ui/sonner"
import { TooltipProvider } from "@/components/ui/tooltip"
import { ErrorBoundary } from "@/components/app/error-boundary"
import { autoHideScrollbars } from "@/lib/scrollbars"
import { watchErrors } from "@/lib/diagnostics"

// The GitHub Pages preview is one index.html with no server to send deep links back to it, so it
// uses hash routing (#/qms/objectives/OBJ-2026-01) and a record opened in a new tab still loads.
// Build it with `npm run build:hash` (VITE_ROUTER=hash, from .env.hash). Normal builds use real paths.
const Router = import.meta.env.VITE_ROUTER === "hash" ? HashRouter : BrowserRouter

autoHideScrollbars()
watchErrors()

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Router>
      <StoreProvider>
        <TooltipProvider delayDuration={200}>
          <ErrorBoundary>
            <App />
          </ErrorBoundary>
          <Toaster />
        </TooltipProvider>
      </StoreProvider>
    </Router>
  </StrictMode>
)
