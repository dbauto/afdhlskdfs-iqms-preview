import { defineConfig } from "@playwright/test"

// End-to-end tests. `npm run e2e` starts the dev server and runs them in Chromium.
export default defineConfig({
  testDir: "e2e",
  use: { baseURL: "http://localhost:5173", viewport: { width: 1440, height: 900 }, actionTimeout: 15_000, launchOptions: { executablePath: process.env.CHROMIUM_PATH || undefined } },
  webServer: { command: "npm run dev -- --port 5173 --strictPort", url: "http://localhost:5173", reuseExistingServer: true },
})
