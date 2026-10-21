import { expect, test } from "@playwright/test"

const sizes = [
  { label: "desktop", width: 1440, height: 900 },
  { label: "compact", width: 1280, height: 650 },
  { label: "tablet", width: 768, height: 1024 },
  { label: "mobile", width: 390, height: 844 },
] as const

for (const size of sizes) {
  for (const appearance of ["Light", "Dark"] as const) {
    test(`Roles scopes stay readable at ${size.label} in ${appearance.toLowerCase()} mode`, async ({ page }, testInfo) => {
      await page.setViewportSize({ width: size.width, height: size.height })
      await page.goto("/")
      await page.evaluate((theme) => {
        localStorage.setItem("iqms.viewAs", "p-al")
        localStorage.setItem("iqms.appearance", theme)
      }, appearance)
      await page.goto("/settings/roles")

      const matrix = page.getByRole("table")
      const scopeCard = page.locator('section[data-slot="card"]').filter({
        has: page.getByRole("heading", { name: "Applies to", exact: true }),
      })
      await expect(matrix).toBeVisible()
      await expect(matrix.getByRole("rowheader", { name: "Applies to" })).toHaveCount(0)
      await expect(scopeCard).toBeVisible()
      await expect(scopeCard.locator("dt")).toHaveCount(9)
      await expect(scopeCard).toContainText("Processes they are assigned to")
      await expect(scopeCard).toContainText("Not their own process")
      await expect(page.getByRole("link", { name: /Process owner/ })).toBeVisible()

      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
      expect(overflow).toBeLessThanOrEqual(1)
      await page.screenshot({
        path: testInfo.outputPath(`roles-scopes-after-${size.label}-${appearance.toLowerCase()}-admin.png`),
        fullPage: true,
      })
    })
  }
}

test("A narrower role cannot open Roles and permissions", async ({ page }, testInfo) => {
  await page.goto("/")
  await page.evaluate(() => localStorage.setItem("iqms.viewAs", "p-bc"))
  await page.goto("/settings/roles")
  await expect(page.getByText("Only administrators can open Roles and permissions")).toBeVisible()
  await expect(page.getByRole("table")).toHaveCount(0)
  await page.screenshot({ path: testInfo.outputPath("roles-scopes-narrow-role.png"), fullPage: true })
})
