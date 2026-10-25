import { expect, test } from "@playwright/test"

test("org chart can enter fullscreen and return to the normal canvas", async ({ page }) => {
  await page.goto("/qms/organization?tab=chart")
  const enter = page.getByRole("button", { name: "Fullscreen", exact: true })
  await expect(enter).toBeVisible()
  await enter.click()
  await expect.poll(() => page.evaluate(() => document.fullscreenElement !== null)).toBe(true)
  await expect(page.getByRole("button", { name: "Exit fullscreen" })).toBeVisible()

  await page.getByRole("button", { name: "Exit fullscreen" }).click()
  await expect.poll(() => page.evaluate(() => document.fullscreenElement === null)).toBe(true)
  await expect(enter).toBeVisible()
  await expect(page.getByRole("button", { name: "Fit to view" })).toBeVisible()
})

test("export fits a wide org chart entirely on one printable page", async ({ page }) => {
  await page.goto("/")
  await page.evaluate(() => {
    const key = "thryvems.preview.v1"
    const data = JSON.parse(localStorage.getItem(key)!)
    // Synthetic organization with more horizontal branches than a portrait page can display at 100%.
    data.settings.orgChart = [
      { id: "org-test-root", type: "Company", title: "Example Organization" },
      ...Array.from({ length: 12 }, (_, i) => ({
        id: `org-test-team-${i}`,
        type: "Department",
        title: `Test Team ${i + 1}`,
        parent: "org-test-root",
      })),
    ]
    localStorage.setItem(key, JSON.stringify(data))
  })
  await page.goto("/qms/organization/print?parts=chart")
  await page.emulateMedia({ media: "print" })
  const chart = page.getByRole("img", { name: /Org chart with 13 boxes/ })
  await expect(chart).toBeVisible()
  const dimensions = await chart.boundingBox()
  expect(dimensions).not.toBeNull()
  // A4/Letter usable space, including room for the section title and page margins.
  expect(dimensions!.width).toBeLessThanOrEqual(680.5)
  expect(dimensions!.height).toBeLessThanOrEqual(780.5)
  const section = page.locator('section[aria-label="Org chart"]')
  await expect(section).toBeVisible()
  const overflow = await section.evaluate((el) => el.scrollWidth > el.clientWidth + 1)
  expect(overflow).toBe(false)
})
