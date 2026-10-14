import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { BrowserRouter } from "react-router-dom"

import "./index.css"
import App from "./App"
import { StoreProvider } from "@/lib/store"
import { Toaster } from "@/components/ui/sonner"
import { TooltipProvider } from "@/components/ui/tooltip"
import { ErrorBoundary } from "@/components/app/error-boundary"
import { autoHideScrollbars } from "@/lib/scrollbars"

autoHideScrollbars()

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <StoreProvider>
        <TooltipProvider delayDuration={200}>
          <ErrorBoundary>
            <App />
          </ErrorBoundary>
          <Toaster />
        </TooltipProvider>
      </StoreProvider>
    </BrowserRouter>
  </StrictMode>
)
