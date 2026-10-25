import { expect, test } from "@playwright/test"

test("Org chart fullscreen opens, resizes, fits and exits without changing edit permissions", async ({ page }) => {
  await page.goto("/")
  await page.evaluate(() => localStorage.setItem("iqms.viewAs", "p-al"))
  await page.goto("/qms/organization?tab=chart")

  const fullScreenButton = page.getByRole("button", { name: "Fullscreen", exact: true })
  await expect(fullScreenButton).toBeVisible()
  await fullScreenButton.click()
  await expect.poll(() => page.evaluate(() => !!document.fullscreenElement)).toBe(true)
  await expect(page.getByRole("button", { name: "Exit fullscreen" })).toBeVisible()

  const canvas = page.getByLabel("Org chart canvas. Drag to move; use the buttons to zoom.")
  const viewportHeight = page.viewportSize()!.height
  await expect.poll(async () => Math.round((await canvas.boundingBox())?.height ?? 0)).toBe(viewportHeight)

  await page.getByRole("button", { name: "Fit to view" }).click()
  await expect(page.getByRole("button", { name: "Exit fullscreen" })).toBeVisible()
  await page.getByRole("button", { name: "Exit fullscreen" }).click()
  await expect.poll(() => page.evaluate(() => document.fullscreenElement === null)).toBe(true)
  await expect(fullScreenButton).toBeVisible()

  // A view-only user keeps the chart controls but not editing actions.
  await page.evaluate(() => localStorage.setItem("iqms.viewAs", "p-bc"))
  await page.reload()
  await expect(page.getByRole("button", { name: "Fullscreen", exact: true })).toBeVisible()
  await expect(page.getByRole("button", { name: "Add box" })).toHaveCount(0)
})

test("Org chart export fits one print page without clipping wide or tall nodes", async ({ page }) => {
  await page.goto("/")
  await page.evaluate(() => localStorage.setItem("iqms.viewAs", "p-al"))
  await page.goto("/qms/organization/print?parts=chart")
  await expect(page.getByRole("heading", { name: "1. Org chart" })).toBeVisible()

  await page.emulateMedia({ media: "print" })
  const chart = page.locator('section[aria-label="Org chart"] [role="img"]:visible')
  await expect(chart).toHaveCount(1)
  const bounds = await chart.boundingBox()
  expect(bounds).not.toBeNull()
  // The scale budget leaves space for A4/Letter printer margins and the heading.
  expect(bounds!.width).toBeLessThanOrEqual(681)
  expect(bounds!.height).toBeLessThanOrEqual(781)
  const doc = await page.pdf({ format: "A4", printBackground: true })
  expect(doc.byteLength).toBeGreaterThan(3000)

  await page.emulateMedia({ media: "screen" })
  await page.setViewportSize({ width: 390, height: 844 })
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
  expect(overflow).toBeLessThanOrEqual(1)
})
