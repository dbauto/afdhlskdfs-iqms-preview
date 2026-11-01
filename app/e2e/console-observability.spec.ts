import { test, expect } from "@playwright/test"

// ADR-046: Operations › Usage and capacity, Errors and alerts, Health.
test.beforeEach(async ({ page }) => {
  await page.context().route("https://fonts.googleapis.com/**", (r) => r.fulfill({ status: 200, contentType: "text/css", body: "" }))
})

test("operations menu lists the three new pages", async ({ page }) => {
  await page.goto("/platform/usage")
  const nav = page.getByRole("navigation", { name: "Platform" })
  for (const name of ["Logs", "Background jobs", "Security scans", "Usage and capacity", "Errors and alerts", "Health"]) {
    await expect(nav.getByRole("link", { name: new RegExp(`^${name}`) }).first()).toBeVisible()
  }
})

test("usage and capacity: active users, capacity table and services", async ({ page }) => {
  const errors: string[] = []
  page.on("pageerror", (e) => errors.push(e.message))
  await page.goto("/platform/usage")
  await expect(page.getByRole("heading", { name: "Usage and capacity", exact: true })).toBeVisible()
  await expect(page.getByText("Active now").first()).toBeVisible()
  await expect(page.getByRole("group", { name: "Active users per hour today" })).toBeVisible()
  await page.getByRole("button", { name: "Weekly", exact: true }).click()
  await expect(page.getByRole("group", { name: "Active users, weekly" })).toBeVisible()
  const cap = page.getByRole("region", { name: "Capacity and bottlenecks" }).or(page.locator('section[aria-label="Capacity and bottlenecks"]'))
  await expect(cap.getByRole("row").nth(1)).toContainText("Bottleneck")
  await expect(cap.getByText("Rows per page")).toBeVisible()
  await expect(page.locator('section[aria-label="Most used services"]')).toContainText("Documents and revisions")
  expect(errors).toEqual([])
})

test("errors and alerts: acknowledge an alert and filter error groups", async ({ page }) => {
  await page.goto("/platform/errors")
  await expect(page.getByRole("heading", { name: "Errors and alerts", exact: true })).toBeVisible()
  const alerts = page.locator('section[aria-label="Open alerts"]')
  await alerts.getByRole("button", { name: "Acknowledge" }).first().click()
  await expect(alerts.getByText("Acknowledged")).toBeVisible()
  const groups = page.locator('section[aria-label="Error groups"]')
  await groups.getByRole("button", { name: "Resolved", exact: true }).click()
  await expect(groups.getByRole("row")).toHaveCount(2)
  await expect(page.locator('section[aria-label="Request trace req_9a41c07e55"]')).toContainText("TypeError at saveAnswer.ts:88")
})

test("health: problems first and integrations", async ({ page }) => {
  await page.goto("/platform/health")
  await expect(page.getByRole("heading", { name: "Health", exact: true })).toBeVisible()
  const byOrg = page.locator('section[aria-label="Health by organisation"]')
  await expect(byOrg.getByRole("row").nth(1)).toContainText("Problem")
  await expect(byOrg.getByRole("row").last()).not.toContainText("Problem")
  await expect(page.locator('section[aria-label="Integrations"]')).toContainText("SharePoint links")
})
