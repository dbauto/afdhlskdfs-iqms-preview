import { defineConfig } from "@playwright/test"

// End-to-end tests exercise a fresh production build in Chromium.
export default defineConfig({
  testDir: "e2e",
  use: { baseURL: "http://localhost:5173", viewport: { width: 1440, height: 900 }, actionTimeout: 15_000, launchOptions: { executablePath: process.env.CHROMIUM_PATH || undefined } },
  webServer: [
    { command: "npm run build && npm run preview -- --port 5173 --strictPort", url: "http://localhost:5173", reuseExistingServer: true },
    ...(process.env.BASELINE_APP ? [{ command: "npm run dev -- --port 5174 --strictPort", cwd: process.env.BASELINE_APP, url: "http://localhost:5174", reuseExistingServer: false }] : []),
  ],
})
