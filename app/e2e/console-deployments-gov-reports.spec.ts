import { test, expect } from "@playwright/test"

// ADR-040: deployments, partner finance view, government reports with scope.
test.beforeEach(async ({ page }) => {
  await page.context().route("https://fonts.googleapis.com/**", (r) => r.fulfill({ status: 200, contentType: "text/css", body: "" }))
})

test("deployments: create, compare and ask to promote a sandbox", async ({ page }) => {
  const errors: string[] = []
  page.on("pageerror", (e) => errors.push(e.message))
  await page.goto("/platform/deployments")
  await expect(page.getByRole("heading", { name: "Deployments", exact: true })).toBeVisible()
  await page.getByRole("button", { name: "Ask to promote" }).first().click()
  await expect(page.getByText(/sent for approval/)).toBeVisible()
  await page.getByRole("button", { name: "Create sandbox" }).first().click()
  await page.getByLabel("Organisation").selectOption("arden")
  await page.getByRole("dialog").getByRole("button", { name: "Create sandbox" }).click()
  await expect(page.getByText("This organisation already has a sandbox.")).toBeVisible()
  await page.getByLabel("Organisation").selectOption("northwind")
  await page.getByRole("dialog").getByRole("button", { name: "Create sandbox" }).click()
  await expect(page.getByText("Sandbox created for Northwind Foods")).toBeVisible()
  expect(errors).toEqual([])
})

test("finance: partner view hides actual hosting", async ({ page }) => {
  await page.goto("/platform/finance")
  await expect(page.getByText("By organisation")).toBeVisible()
  await page.getByLabel("View as", { exact: true }).selectOption("partner-a")
  await expect(page.getByText("Your organisations").first()).toBeVisible()
  await expect(page.getByText("Costs this month")).toHaveCount(0)
  await expect(page.getByText("By organisation")).toHaveCount(0)
})

test("government reports: generate with a scope and regenerate", async ({ page }) => {
  const errors: string[] = []
  page.on("pageerror", (e) => errors.push(e.message))
  await page.goto("/platform/government-reports")
  await expect(page.getByRole("heading", { name: "Government reports" })).toBeVisible()
  await page.getByRole("button", { name: "NPC" }).click()
  const row = page.getByRole("row", { name: /Annual Security Incident Report/ })
  await row.getByRole("button", { name: "Generate draft" }).click()
  await expect(page.getByLabel("Start date")).toHaveValue("2026-01-01")
  await expect(page.getByLabel("End date")).toHaveValue("2026-12-31")
  await page.getByLabel("End date").fill("2026-01-01")
  await page.getByLabel("Start date").fill("2026-06-30")
  await page.getByRole("button", { name: "Generate draft" }).click()
  await expect(page.getByText("The start date must be on or before the end date.")).toBeVisible()
  await page.getByLabel("Start date").fill("2026-01-01")
  await page.getByLabel("End date").fill("2026-06-30")
  await page.getByRole("button", { name: "Generate draft" }).click()
  await expect(page.getByRole("heading", { name: "Annual Security Incident Report" })).toBeVisible()
  await expect(page.getByText("Custom scope")).toBeVisible()
  await expect(page.getByText(/4 recorded/)).toBeVisible()
  await page.getByLabel("Quick pick").selectOption("Calendar year 2026")
  await page.getByRole("button", { name: "Regenerate draft" }).click()
  await expect(page.getByText(/7 recorded/)).toBeVisible()
  await expect(page.getByText("Custom scope")).toHaveCount(0)
  expect(errors).toEqual([])
})

for (const width of [390, 768, 1280, 1920]) {
  test(`no horizontal scroll on new console pages at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 })
    for (const path of ["/platform/deployments", "/platform/finance", "/platform/government-reports", "/platform/government-reports/npc-asir?from=2026-01-01&to=2026-12-31"]) {
      await page.goto(path)
      await page.waitForLoadState("networkidle")
      expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth), path).toBeLessThanOrEqual(1)
    }
  })
}
