import { test, expect } from "@playwright/test"

// ADR-042: approvals, activity log, partners, findings, sections on the organisation page, pricing, releases,
// notifications, saving across reloads, clickable overview, phone menu.
test.beforeEach(async ({ page }) => {
  await page.context().route("https://fonts.googleapis.com/**", (r) => r.fulfill({ status: 200, contentType: "text/css", body: "" }))
})

test("approve a promotion; it shows in the activity log and survives a reload", async ({ page }) => {
  const errors: string[] = []
  page.on("pageerror", (e) => errors.push(e.message))
  await page.goto("/platform/approvals")
  await expect(page.getByText("A second admin must decide this, not the person who asked.")).toBeVisible()
  const row = page.getByRole("row", { name: /Promote 2026.10.4 to Arden/ })
  await row.getByRole("button", { name: "Approve" }).click()
  await page.getByRole("dialog").getByRole("button", { name: "Approve" }).click()
  await expect(page.getByText("Nothing waits for approval").or(page.getByRole("row", { name: /SR-1043/ })).first()).toBeVisible()
  await page.reload()
  await page.getByRole("button", { name: /Decided/ }).click()
  await expect(page.getByRole("row", { name: /Promote 2026.10.4 to Arden/ })).toContainText("Approved")
  await page.goto("/platform/organisations/arden")
  await expect(page.getByText("2026.10.4").first()).toBeVisible()
  await page.goto("/platform/activity")
  await expect(page.getByRole("row", { name: /approved Promote 2026.10.4 to Arden/ })).toBeVisible()
  expect(errors).toEqual([])
})

test("a partner co-admin sees only their organisations and their share", async ({ page }) => {
  await page.goto("/platform")
  await page.getByLabel("Preview, view as").selectOption({ label: "View as Paolo Reyes (Co-admin)" })
  await page.goto("/platform/organisations")
  await expect(page.getByRole("cell", { name: /Arden & Co. arden/ })).toBeVisible()
  await expect(page.getByText("Meridian Clinics")).toHaveCount(0)
  await page.goto("/platform/finance")
  await expect(page.getByText("Your organisations").first()).toBeVisible()
  await expect(page.getByLabel("View as", { exact: true })).toHaveCount(0)
  const nav = page.getByRole("navigation", { name: "Platform" })
  await expect(nav.getByRole("link", { name: "Deployments" })).toHaveCount(0)
  await expect(nav.getByRole("link", { name: "Platform team" })).toHaveCount(0)
  await page.goto("/platform/organisations/meridian")
  await expect(page.getByText("This page or record doesn’t exist")).toBeVisible()
})

test("confirm an AI finding; sections, plan, release and bell", async ({ page }) => {
  await page.goto("/platform/scans")
  await page.getByRole("button", { name: /Link check allows a redirect/ }).click()
  await page.getByRole("button", { name: "Confirm finding" }).click()
  await expect(page.getByText("SEC-2026-015 confirmed")).toBeVisible()

  await page.goto("/platform/organisations/northwind")
  await expect(page.getByRole("heading", { name: "Sections" })).toBeVisible()
  await page.getByRole("button", { name: "Change plan or seats" }).click()
  await page.getByRole("spinbutton", { name: "Seats" }).fill("1")
  await page.getByRole("button", { name: "Save plan" }).click()
  await expect(page.getByText(/Enter at least/)).toBeVisible()
  await page.getByRole("spinbutton", { name: "Seats" }).fill("260")
  await page.getByRole("button", { name: "Save plan" }).click()
  await expect(page.getByText(/of 260 used/)).toBeVisible()

  await page.goto("/platform/deployments")
  await page.getByRole("button", { name: "Register release" }).click()
  await page.getByLabel("Version").fill("2026.11.1")
  await page.getByLabel("Release notes").fill("Approvals and activity log")
  await page.getByRole("dialog").getByRole("button", { name: "Register release" }).click()
  await expect(page.getByText("Release 2026.11.1 registered")).toBeVisible()

  await page.getByRole("button", { name: /Notifications, \d+ unread/ }).click()
  await page.getByRole("button", { name: "Mark all read" }).click()
  await page.keyboard.press("Escape")
  await expect(page.getByRole("button", { name: "Notifications" })).toBeVisible()
})

test("phone menu and clickable figures", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto("/platform")
  await page.getByRole("button", { name: "Open menu" }).click()
  await page.getByRole("navigation", { name: "Platform pages" }).getByRole("link", { name: "Approvals" }).click()
  await expect(page.getByRole("heading", { name: "Approvals" })).toBeVisible()
  await page.goto("/platform")
  await page.getByRole("link", { name: /Revenue: .*Open details/ }).click()
  await expect(page.getByRole("heading", { name: "Finance", exact: true })).toBeVisible()
})

for (const width of [390, 768, 1280, 1920]) {
  test(`no horizontal scroll on approvals, activity, team, organisation at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 })
    for (const path of ["/platform/approvals", "/platform/activity", "/platform/team", "/platform/organisations/arden", "/platform/finance"]) {
      await page.goto(path)
      await page.waitForLoadState("networkidle")
      expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth), path).toBeLessThanOrEqual(1)
    }
  })
}
