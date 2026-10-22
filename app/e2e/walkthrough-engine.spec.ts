import { expect, test } from "@playwright/test"

const eligibleRoutes = [
  "/", "/my-tasks", "/qms/organization", "/qms/policies", "/qms/processes", "/qms/objectives",
  "/documents", "/documents/reviews", "/risks", "/evidence", "/audits", "/corrective-action",
  "/settings/organization", "/settings/users", "/settings/roles", "/settings/security",
  "/settings/integrations", "/settings/branding", "/settings/activity", "/settings/process-structure",
  "/settings/certification", "/settings/qms-rules", "/settings/numbering", "/settings/review",
  "/settings/retention", "/settings/profile", "/settings/appearance", "/settings/notifications",
  "/settings/data-export", "/settings/billing", "/settings/privacy", "/settings/legal", "/settings/support",
  "/settings/about", "/platform", "/platform/requests", "/platform/logs", "/platform/jobs",
  "/platform/reports", "/platform/support", "/platform/team", "/qms/procedures",
]

test("every approved menu route offers the shared walkthrough and Management Review remains excluded", async ({ page }) => {
  await page.goto("/")
  for (const route of eligibleRoutes) {
    await page.evaluate((path) => {
      history.pushState({}, "", path)
      window.dispatchEvent(new PopStateEvent("popstate"))
    }, route)
    await expect(page.getByRole("button", { name: "Play walkthrough" }).first(), route).toBeVisible()
  }
  await page.evaluate(() => {
    history.pushState({}, "", "/management-review")
    window.dispatchEvent(new PopStateEvent("popstate"))
  })
  await expect(page.getByRole("button", { name: "Play walkthrough" })).toHaveCount(0)
})

test("walkthrough advances without changing business data and can be replayed", async ({ page }) => {
  await page.goto("/")
  const before = await page.evaluate(() => localStorage.getItem("thryvems.preview.v1"))
  await page.getByRole("button", { name: "Play walkthrough" }).click()
  await expect(page.getByRole("dialog", { name: /Welcome to Overview/ })).toBeVisible()
  await expect(page.locator("[data-walkthrough-target='true']")).toBeVisible()
  await page.getByRole("button", { name: "Next" }).click()
  await expect(page.getByText("Step 2 of 3")).toBeVisible()
  await page.getByRole("button", { name: "Back" }).click()
  await expect(page.getByText("Step 1 of 3")).toBeVisible()
  await page.getByRole("button", { name: "Start again" }).click()
  await expect(page.getByText("Step 1 of 3")).toBeVisible()
  expect(await page.evaluate(() => localStorage.getItem("thryvems.preview.v1"))).toBe(before)
})

test("compact walkthrough stays in the viewport and Escape restores trigger focus", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto("/documents")
  const trigger = page.getByRole("button", { name: "Play walkthrough" })
  await trigger.click()
  const panel = page.getByRole("dialog")
  await expect(panel).toBeVisible()
  const box = await panel.boundingBox()
  expect(box).not.toBeNull()
  expect(box!.x).toBeGreaterThanOrEqual(0)
  expect(box!.x + box!.width).toBeLessThanOrEqual(390)
  await page.keyboard.press("Escape")
  await expect(panel).toBeHidden()
  await expect(trigger).toBeFocused()
})
