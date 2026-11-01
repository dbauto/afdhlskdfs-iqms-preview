import { expect, test } from "@playwright/test"

// The Overview is not real time: it shows the last analysis and updates only with "Analyze latest data" (COV-21).
test("Overview shows when it was last analyzed and re-analyzes on request", async ({ page }) => {
  await page.goto("/")
  await expect(page.getByText(/^Last analyzed /)).toBeVisible()
  const analyze = page.getByRole("button", { name: "Analyze latest data" })
  await expect(analyze).toBeVisible()
  await analyze.click()
  await expect(page.getByRole("button", { name: "Analyzing…" })).toBeDisabled()
  await expect(page.getByText(/^Last analyzed /)).toBeVisible()
  await expect(page.getByRole("button", { name: "Analyze latest data" })).toBeEnabled()
})
